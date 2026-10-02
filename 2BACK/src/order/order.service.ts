import { Injectable, BadRequestException, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { ClientEntity } from '../entities/client.entity';
import { CompanyEntity } from '../entities/company.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderStatusFront } from '../dto/order.status.front.dto';

/** Rut significativo (misma regla que el matcher): >=7 chars, no solo ceros. */
function isMeaningfulRut(rut?: string | null): boolean {
  const clean = cleanRut(rut);
  return clean.length >= 7 && !/^0+$/.test(clean);
}

/** Extrae solo dígitos + k/K para comparar ruts. */
function cleanRut(rut?: string | null): string {
  return (rut ?? '').toLowerCase().replace(/[^0-9kK]/g, '');
}

/** Payload de registrar orden: trae los extras del flujo empresas. */
type RegisterOrderPayload = ClientEntity & {
  is_company?: boolean;
  companyId?: number;
};

@Injectable()
export class OrderService {
  constructor( 
    @InjectRepository(ClientEntity)
    private clientRepository: Repository<ClientEntity>,
    @InjectRepository(CompanyEntity)
    private companyRepository: Repository<CompanyEntity>,
    @InjectRepository(OrderEntity)
    private orderRepository: Repository<OrderEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async getAllOrders(): Promise<ClientEntity[]> {
    const orders: ClientEntity[] = await this.clientRepository
      .createQueryBuilder('client')
      .innerJoinAndSelect('client.orders', 'orders').orderBy('orders.id', 'DESC')
      .getMany();
     return orders;
  }

  async getOrdersByRut(rut:string): Promise<ClientEntity[]> {
    const orders: ClientEntity[] = await this.clientRepository
      .createQueryBuilder('client')
      .innerJoinAndSelect('client.orders', 'orders').orderBy('orders.id', 'DESC')
      .where('client.rut_raw = :rut AND client.active = true',{rut})
      .getMany();
     return orders;
  }
  async getClientByUserId(id:string): Promise<ClientEntity | null> {
    const order: ClientEntity | null = await this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.orders', 'orders').orderBy('orders.id', 'DESC')
      .where('client.id = :id AND client.active = true',{id})
      .getOne();
     return order;
  }
  async getOrdersByCode(code:string): Promise<ClientEntity | null> {
    const order: ClientEntity | null = await this.clientRepository
      .createQueryBuilder('client')
      .innerJoinAndSelect('client.orders', 'orders')
      .where('orders.id = :code AND client.active = true', { code: parseInt(code) })
      .orderBy('orders.id', 'DESC')
      .getOne();
     return order;
  }

  /**
   * Últimas órdenes globales (panel "Órdenes recientes" del finder).
   * Ligero para el servidor: solo `limit` órdenes con su cliente.
   */
  async findRecent(limit = 6): Promise<{ items: OrderEntity[]; total: number }> {
    const capped = Math.min(Math.max(limit, 1), 20);
    const qb = this.orderRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.client', 'c');
    const total = await qb.getCount();
    const items = await qb.orderBy('o.id', 'DESC').take(capped).getMany();
    return { items, total };
  }
  

  async registerClientOrder(client: RegisterOrderPayload): Promise<ClientEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: match by rut_normalizado + name (if normalized RUT available)
      const trimmedName = client.name.toLowerCase().trim();
      let dbClient: ClientEntity | null | undefined;

      if (client.rut_normalizado) {
        const normalizedWhere = {
          name: trimmedName,
          rut_normalizado: client.rut_normalizado.toLowerCase().trim(),
          active: true,
        };
        dbClient = await queryRunner.manager.findOne(ClientEntity, {
          where: normalizedWhere,
          lock: { mode: 'pessimistic_write' },
        });
      }

      // Step 2: fallback to rut_raw + name (existing behavior)
      if (!dbClient) {
        const where = {
          name: trimmedName,
          rut_raw: client.rut_raw.toLowerCase().trim(),
          active: true,
        };
        dbClient = await queryRunner.manager.findOne(ClientEntity, {
          where: where as any,
          lock: { mode: 'pessimistic_write' },
        });
      }

      // Step 3: fallback to client.id
      if (!dbClient && client.id) {
        dbClient = await queryRunner.manager.findOne(ClientEntity, {
          where: { id: client.id, active: true },
          lock: { mode: 'pessimistic_write' },
        });
      }

      // Step 4: attach order or create new
      const equalName = dbClient?.name?.toLowerCase().trim() === trimmedName;
      const normalize = (r: string | null | undefined) => r?.toLowerCase().trim().replace(/[.-]/g, '') || '';
      const equalRut = normalize(dbClient?.rut_raw || '') === normalize(client.rut_raw);
      if (dbClient && equalName && equalRut && client.orders && client.orders.length > 0) {
        // Cliente existente: la empresa ya vive en el cliente — solo se
        // anexa la orden nueva (spec order-registration).

        // Fetch existing orders for the client
        dbClient.orders = await queryRunner.manager.find(OrderEntity, {
          where: { client: { id: dbClient.id } },
        });

        // C5: Clone instead of mutating in place
        const orderToSave = { ...client.orders[0], client: dbClient };
        const savedOrder = await queryRunner.manager.save(OrderEntity, orderToSave);
        await this.assignOrderCode(queryRunner.manager, savedOrder);
        // Remove circular reference before returning
        savedOrder.client = undefined;
        dbClient.orders.push(savedOrder);
      } else {
        // Cliente nuevo: resolver empresa (reglas spec companies) y guardar.
        // resolveCompany muta el payload (p. ej. copia el rut de la empresa);
        // el destructuring va DESPUÉS para capturar esa mutación.
        const company = await this.resolveCompany(queryRunner.manager, client);
        const {
          id: _unused,
          is_company: _isCompany,
          companyId: _companyId,
          ...newClientData
        } = client;
        newClientData.company_id = company?.id ?? null;
        newClientData.company = company ?? null;
        dbClient = await queryRunner.manager.save(ClientEntity, newClientData as ClientEntity);
        // Cascade saves nested orders; assign codes to any order with a fresh id
        for (const savedOrder of dbClient.orders ?? []) {
          await this.assignOrderCode(queryRunner.manager, savedOrder);
        }
      }
      await queryRunner.commitTransaction();
      return dbClient!;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      // J1: business guards (HttpException, e.g. validation 400s) travel
      // untouched — wrapping them would turn a deliberate 400 into a 500
      // and the client would never see the reason.
      if (error instanceof HttpException) {
        throw error;
      }
      const wrappedError = new Error(`Error registering client order: ${error.message}`);
      (wrappedError as any).cause = error;
      throw wrappedError;
    } finally {
      await queryRunner.release();
    }
  }
  async updateOrder(id: number,order: OrderEntity): Promise<OrderEntity | null> {
    try {
      let dbOrder = await this.orderRepository.findOne({where:{id:id}});
      if(dbOrder){
        dbOrder=Object.assign(dbOrder,order);
        await this.orderRepository.save(dbOrder);
      }
      return dbOrder;
    } catch (error : any) {
      // J1: HttpExceptions keep their status; only unexpected errors get
      // wrapped (cause preserved).
      if (error instanceof HttpException) {
        throw error;
      }
      const wrappedError = new Error(String(error));
      (wrappedError as any).cause = error;
      throw wrappedError;
    }
  }
  async updateOrderStatus(orderId: number,order: OrderStatusFront): Promise<OrderEntity | null> {
    try {
      let dbOrder = await this.orderRepository.findOne({where:{id:orderId}});
      if(dbOrder){
        dbOrder=Object.assign(dbOrder,order);
        await this.orderRepository.save(dbOrder);
      }
      return dbOrder;
    } catch (error : any) {
      // J1: HttpExceptions keep their status; only unexpected errors get
      // wrapped (cause preserved).
      if (error instanceof HttpException) {
        throw error;
      }
      const wrappedError = new Error(String(error));
      (wrappedError as any).cause = error;
      throw wrappedError;
    }
  }

  /**
   * Assign the human-readable code `ORD-{1000+id}` to a saved order.
   * Orders without an id (e.g. not yet persisted) are skipped.
   */
  private async assignOrderCode(manager: EntityManager, order: OrderEntity): Promise<void> {
    if (!order.id) {
      return;
    }
    const code = `ORD-${1000 + order.id}`;
    await manager.update(OrderEntity, order.id, { code });
    order.code = code;
  }

  /**
   * Reglas de empresa (spec `companies`, design §2 — portado de ABAGAS):
   * 1. `companyId` explícito → validar que existe y que el rut del cliente
   *    CALZA con el de la empresa (copia si falta; 400 si difiere).
   * 2. `is_company=true` con rut significativo: empresa activa con ese rut →
   *    link automático; no existe → crear.
   * 3. Resto (particulares, rut basura, is_company ausente) → NULL.
   *    Sin grupos 1:1 — el auto-link NO aplica a particulares (Judgment Day
   *    A3/B1: un particular con rut de empresa no debe quedar linkeado).
   */
  private async resolveCompany(
    manager: EntityManager,
    data: RegisterOrderPayload & { company_name?: string },
  ): Promise<CompanyEntity | null> {
    if (data.companyId) {
      const company = await manager.findOne(CompanyEntity, {
        where: { id: data.companyId, active: true },
      });
      if (company) {
        if (!data.rut_normalizado) data.rut_normalizado = company.rut_normalizado;
        if (!data.rut_raw) data.rut_raw = company.rut_normalizado;
        const clientRut = cleanRut(data.rut_normalizado);
        const companyRut = cleanRut(company.rut_normalizado);
        if (clientRut && companyRut && clientRut !== companyRut) {
          throw new BadRequestException(
            `El RUT del cliente (${data.rut_raw || data.rut_normalizado}) no calza con el de la empresa #${company.id} (${company.rut_normalizado})`,
          );
        }
        return company;
      }
    }

    if (!isMeaningfulRut(data.rut_normalizado) || data.is_company !== true) {
      // La basura ('0', vacío, <7) jamás agrupa, y los particulares tampoco
      // (spec junk-rut-never-company + particular-flow-unchanged).
      return null;
    }

    const existing = await manager.findOne(CompanyEntity, {
      where: { rut_normalizado: data.rut_normalizado!, active: true },
    });
    if (existing) {
      return existing;
    }

    // B4 (post-JD): si existe una empresa INACTIVA con ese rut, se reactiva
    // en vez de crear una nueva (la UNIQUE de rut_normalizado daría 500).
    const inactive = await manager.findOne(CompanyEntity, {
      where: { rut_normalizado: data.rut_normalizado! },
    });
    if (inactive) {
      inactive.active = true;
      return manager.save(CompanyEntity, inactive);
    }

    return manager.save(CompanyEntity, {
      rut_normalizado: data.rut_normalizado!,
      name: (data.company_name ?? '').trim() || data.name,
      active: true,
    });
  }
}
