import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientEntity } from '../entities/client.entity';
import { ClientGroupEntity } from '../entities/client-group.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderStatusFront } from '../dto/order.status.front.dto';

@Injectable()
export class OrderService {
  constructor( 
    @InjectRepository(ClientEntity)
    private clientRepository: Repository<ClientEntity>,
    @InjectRepository(ClientGroupEntity)
    private groupRepository: Repository<ClientGroupEntity>,
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
  

  async registerClientOrder(client: ClientEntity): Promise<ClientEntity> {
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
        // C3: Update company_name if different from frontend
        if (client.company_name !== undefined && client.company_name !== dbClient.company_name) {
          await queryRunner.manager.update(ClientEntity, dbClient.id, {
            company_name: client.company_name,
          });
        }

        // Fetch existing orders for the client
        dbClient.orders = await queryRunner.manager.find(OrderEntity, {
          where: { client: { id: dbClient.id } },
        });

        // C5: Clone instead of mutating in place
        const orderToSave = { ...client.orders[0], client: dbClient };
        const savedOrder = await queryRunner.manager.save(OrderEntity, orderToSave);
        // Remove circular reference before returning
        savedOrder.client = undefined;
        dbClient.orders.push(savedOrder);
      } else {
        // C4: Clone instead of deleting properties
        const { id: _unused, ...newClientData } = client;
        // Find or create a group for the new client
        if (newClientData.rut_normalizado) {
          const existingGroup = await queryRunner.manager.findOne(ClientGroupEntity, {
            where: { rut_normalizado: newClientData.rut_normalizado },
          });
          newClientData.group = existingGroup || await queryRunner.manager.save(ClientGroupEntity, {
            rut_normalizado: newClientData.rut_normalizado,
            name: newClientData.name,
            active: true,
          });
        } else {
          newClientData.group = await queryRunner.manager.save(ClientGroupEntity, {
            name: newClientData.name,
            active: true,
          });
        }
        dbClient = await queryRunner.manager.save(ClientEntity, newClientData as ClientEntity);
      }
      await queryRunner.commitTransaction();
      return dbClient!;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
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
      const wrappedError = new Error(String(error));
      (wrappedError as any).cause = error;
      throw wrappedError;
    }
  }
}
