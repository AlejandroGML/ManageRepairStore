import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WorkerEntity } from '../entities/worker.entity';
import { ProductEntity } from '../entities/product.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { StockService } from '../product/stock.service';

const WORKER_OPERATIONS = ['Asignación a Trabajador', 'Devolución de Trabajador'];

/**
 * Repuestos de trabajadores: pool global de trabajadores y asignaciones
 * de stock por producto. Cada movimiento queda en transaction_entity con
 * assignedWorker = nombre del trabajador, por lo que aparece en el
 * historial de cada producto involucrado sin tablas extra.
 *
 * Reglas:
 *  - Cantidad > 0: asignación — el stock sale de bodega (mutateStock -qty).
 *  - Cantidad < 0: devolución — vuelve a bodega (+|qty|); NO puede superar
 *    el saldo asignado previo al trabajador para ese producto (409).
 */
@Injectable()
export class WorkerService {
  constructor(
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    private readonly dataSource: DataSource,
    private readonly stockService: StockService,
  ) {}

  list(): Promise<WorkerEntity[]> {
    return this.workerRepository.find({ order: { name: 'ASC' } });
  }

  async create(name: string): Promise<WorkerEntity> {
    const clean = (name ?? '').trim();
    if (!clean) {
      throw new HttpException('El nombre es requerido', HttpStatus.BAD_REQUEST);
    }
    const dup = await this.workerRepository.findOne({
      where: { name: clean.toLowerCase() },
    });
    if (dup) {
      throw new HttpException('Ya existe un trabajador con ese nombre', HttpStatus.CONFLICT);
    }
    return this.workerRepository.save(this.workerRepository.create({ name: clean }));
  }

  /** DELETE: bloqueado si el trabajador tiene movimientos (historial válido). */
  async remove(id: number): Promise<void> {
    const worker = await this.workerRepository.findOne({ where: { id } });
    if (!worker) {
      throw new HttpException('Trabajador no encontrado', HttpStatus.NOT_FOUND);
    }
    const movements = await this.transactionRepository.count({
      where: { assignedWorker: worker.name },
    });
    if (movements > 0) {
      throw new HttpException(
        `El trabajador tiene ${movements} movimientos registrados; no se puede eliminar`,
        HttpStatus.CONFLICT,
      );
    }
    await this.workerRepository.delete(id);
  }

  /**
   * Saldo asignado por producto para un trabajador:
   * SUM(cantidad) de sus asignaciones (+) y devoluciones (−).
   */
  async getBalance(workerId: number): Promise<Array<{ productId: number; name: string; assigned: number }>> {
    const worker = await this.workerRepository.findOne({ where: { id: workerId } });
    if (!worker) {
      throw new HttpException('Trabajador no encontrado', HttpStatus.NOT_FOUND);
    }
    const rows: Array<{ product_id: number; name: string; assigned: string }> =
      await this.dataSource.query(
        `SELECT t."productId" AS product_id, p.name AS name, COALESCE(SUM(t.quantity), 0)::text AS assigned
         FROM transaction_entity t
         LEFT JOIN product_entity p ON p.id = t."productId"
         WHERE t."assignedWorker" = $1 AND t.operation = ANY($2) AND t.deleted = false
         GROUP BY t."productId", p.name
         HAVING COALESCE(SUM(t.quantity), 0) <> 0
         ORDER BY p.name ASC`,
        [worker.name, WORKER_OPERATIONS],
      );
    return rows.map((r) => ({
      productId: Number(r.product_id),
      name: r.name ?? '',
      assigned: Number(r.assigned),
    }));
  }

  /**
   * Lote atómico de movimientos de repuestos para un trabajador.
   * Cada línea: { productId, quantity (+ asigna / − devuelve), }.
   */
  async createMovements(
    workerId: number,
    products: Array<{ productId: number; quantity: number }>,
    detail?: string,
  ): Promise<{ created: number; workerName: string }> {
    if (!Array.isArray(products) || products.length === 0) {
      throw new HttpException('Se requiere al menos un producto', HttpStatus.BAD_REQUEST);
    }
    for (const p of products) {
      if (!p.productId || !p.quantity || typeof p.quantity !== 'number') {
        throw new HttpException('Cada línea requiere productId y quantity ≠ 0', HttpStatus.BAD_REQUEST);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const worker = await queryRunner.manager.findOne(WorkerEntity, { where: { id: workerId } });
      if (!worker) {
        throw new HttpException('Trabajador no encontrado', HttpStatus.NOT_FOUND);
      }

      for (const line of products) {
        let operation: string;
        let txQuantity: number;

        if (line.quantity > 0) {
          // Asignación: el stock sale de bodega
          operation = 'Asignación a Trabajador';
          txQuantity = line.quantity;
          await this.stockService.mutateStock(queryRunner, line.productId, -line.quantity);
        } else {
          // Devolución: vuelve a bodega, pero no puede exceder el saldo asignado
          operation = 'Devolución de Trabajador';
          txQuantity = line.quantity; // negativo
          const balanceRows: Array<{ assigned: string }> = await queryRunner.query(
            `SELECT COALESCE(SUM(quantity), 0)::text AS assigned
             FROM transaction_entity
             WHERE "assignedWorker" = $1 AND operation = ANY($2)
               AND deleted = false AND "productId" = $3`,
            [worker.name, WORKER_OPERATIONS, line.productId],
          );
          const balance = Number(balanceRows[0]?.assigned ?? 0);
          const returning = Math.abs(line.quantity);
          if (returning > balance) {
            throw new HttpException(
              `Devolución de ${returning} supera el saldo asignado (${balance}) para el producto #${line.productId}`,
              HttpStatus.CONFLICT,
            );
          }
          await this.stockService.mutateStock(queryRunner, line.productId, returning);
        }

        const base = operation === 'Asignación a Trabajador'
          ? 'Asignación de repuestos'
          : 'Devolución de repuestos';
        const description = detail?.trim() ? `${base} · ${detail.trim()}` : base;

        const tx = this.transactionRepository.create({
          operation,
          quantity: txQuantity,
          assignedWorker: worker.name,
          description,
          finalStock: 0, // se actualiza abajo con el stock real
          location: 'Sin Datos',
          payMethod: 'Sin Datos',
          createdAt: new Date(),
          product: { id: line.productId } as ProductEntity,
        });
        const saved = await queryRunner.manager.save(tx);
        // Stock Final real tras la mutación
        const fresh = await queryRunner.manager.findOne(ProductEntity, {
          where: { id: line.productId },
        });
        await queryRunner.manager.update(TransactionEntity, saved.id!, {
          finalStock: fresh?.stock ?? 0,
        });
      }

      await queryRunner.commitTransaction();
      return { created: products.length, workerName: worker.name };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** Historial paginado de movimientos (todos los trabajadores o uno). */
  async getMovements(
    limit = 20,
    offset = 0,
    workerId?: number,
  ): Promise<{
    items: Array<{
      id: number;
      date: Date;
      worker: string;
      product: string;
      qty: number;
      description: string;
    }>;
    total: number;
  }> {
    const capped = Math.min(Math.max(limit, 1), 100);
    let workerName: string | null = null;
    if (workerId) {
      const worker = await this.workerRepository.findOne({ where: { id: workerId } });
      workerName = worker?.name ?? null;
    }
    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.product', 'p')
      .where('t.operation = ANY(:ops)', { ops: WORKER_OPERATIONS })
      .orderBy('t.id', 'DESC');
    if (workerName) {
      qb.andWhere('t."assignedWorker" = :workerName', { workerName });
    }
    const total = await qb.getCount();
    const rows = await qb.skip(offset).take(capped).getMany();
    return {
      items: rows.map((t) => ({
        id: t.id,
        date: t.createdAt,
        worker: t.assignedWorker ?? '',
        product: t.product?.name ?? '',
        qty: t.quantity ?? 0,
        description: t.description ?? '',
      })),
      total,
    };
  }
}
