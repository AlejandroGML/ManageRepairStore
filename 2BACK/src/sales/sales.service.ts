import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionEntity } from '../entities/transaction.entity';
import { SaleEntity } from '../entities/sale.entity';
import { StockService } from '../product/stock.service';

/**
 * Sales domain: atomic batch sales. Stock mutations always go through
 * StockService.mutateStock() inside a single QueryRunner transaction.
 */
@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,

    @InjectRepository(SaleEntity)
    private readonly salesRepository: Repository<SaleEntity>,

    private readonly dataSource: DataSource,

    private readonly stockService: StockService,
  ) {}

  /**
   * Today's sales summary for the dashboard KPI: total amount and sale count
   * for the current day only (`createdAt >= startOfDay`).
   */
  async getTodaySummary(): Promise<{ total: number; count: number }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const raw = await this.salesRepository
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.total), 0)', 'total')
      .addSelect('COUNT(sale.id)', 'count')
      .where('sale.createdAt >= :startOfDay', { startOfDay })
      .getRawOne();

    // Postgres returns decimal/bigint aggregates as strings via raw queries
    return { total: Number(raw.total), count: Number(raw.count) };
  }

  /**
   * Create a Sale with multiple product transactions in a single atomic
   * operation. If any product fails (insufficient stock, not found), the
   * entire batch is rolled back — zero partial commits.
   */
  async createSaleBatch(body: {
    products: Array<{
      productId: number;
      quantity: number;
      sellingPrice: number;
      purchaseDiscount?: number;
      location?: string;
      description?: string;
    }>;
    total: number;
  }): Promise<SaleEntity> {
    // Validate input before any DB work
    if (!Array.isArray(body.products) || body.products.length === 0) {
      throw new HttpException('At least one product is required', HttpStatus.BAD_REQUEST);
    }
    for (const p of body.products) {
      if (!p.productId || typeof p.productId !== 'number' || !p.quantity || typeof p.quantity !== 'number') {
        throw new HttpException('Each product requires productId and quantity', HttpStatus.BAD_REQUEST);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create SaleEntity within the transaction
      const sale = this.salesRepository.create({ total: body.total, snapshot: [] });
      const savedSale = await queryRunner.manager.save(sale);
      const snapshotEntries: any[] = [];

      // Process each product in sequence within the same transaction
      for (const p of body.products) {
        const { newStock } = await this.stockService.mutateStock(
          queryRunner,
          p.productId,
          p.quantity,
        );

        // Carry over the product's current max discount policy: sale
        // transactions must not zero it out, otherwise the POS (which reads
        // the latest transaction) loses the discount cap after the first sale.
        const lastTx = await queryRunner.manager.findOne(TransactionEntity, {
          where: { product: { id: p.productId }, deleted: false },
          order: { createdAt: 'DESC' },
        });

        const tx = this.transactionRepository.create({
          operation: 'Venta Producto',
          quantity: p.quantity,
          sellingPrice: p.sellingPrice || 0,
          finalStock: newStock,
          maxDiscount: lastTx?.maxDiscount ?? 0,
          purchaseDiscount: p.purchaseDiscount || 0,
          location: p.location || 'Sin Datos',
          description: p.description || '',
          snapshotData: {},
          createdAt: new Date(),
          product: { id: p.productId },
          sale: savedSale,
        });

        await queryRunner.manager.save(tx);

        snapshotEntries.push({
          productId: p.productId,
          quantity: p.quantity,
          sellingPrice: p.sellingPrice,
          discount: p.purchaseDiscount || 0,
          finalStock: newStock,
          operation: 'Venta Producto',
          assignedWorker: 'Sin Datos',
          createdAt: new Date().toISOString(),
          description: p.description || '',
        });
      }

      // Update sale snapshot within the transaction
      await queryRunner.manager.update(SaleEntity, savedSale.id, { snapshot: snapshotEntries });

      await queryRunner.commitTransaction();

      // Re-fetch with relations
      return (await this.salesRepository.findOne({
        where: { id: savedSale.id },
        relations: { transactions: true },
      }))!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
