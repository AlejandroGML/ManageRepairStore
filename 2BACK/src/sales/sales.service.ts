import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionEntity } from '../entities/transaction.entity';
import { SaleEntity } from '../entities/sale.entity';
import { StockService } from '../product/stock.service';

/**
 * Sales domain: legacy single sales and atomic batch sales. Stock mutations
 * always go through StockService.mutateStock() inside a single QueryRunner
 * transaction.
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

  // Crear una venta con las transacciones correspondientes
  async createSale(transactions: TransactionEntity[], total: number) {
    // Crear una nueva venta
    const sale = new SaleEntity();
    sale.total = total;

    // Crear un snapshot de las transacciones
    const snapshot = transactions.map(transaction => ({
      operation: transaction.operation,
      productId: transaction.product?.id,
      quantity: transaction.quantity,
      sellingPrice: transaction.sellingPrice,
      discount: transaction.maxDiscount,
      finalStock: transaction.finalStock,
      assignedWorker: transaction.assignedWorker,
      createdAt: transaction.createdAt,
      description: transaction.description,
    }));
    sale.snapshot = snapshot; // Guarda el snapshot como JSON

    // Guardar la venta en la base de datos
    const savedSale = await this.salesRepository.save(sale);

    // Asocia cada transacción a la venta solo si está presente
    for (const transaction of transactions) {
      transaction.sale = savedSale;
      await this.transactionRepository.save(transaction);
    }

    return savedSale;
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

        const tx = this.transactionRepository.create({
          operation: 'Venta Producto',
          quantity: p.quantity,
          sellingPrice: p.sellingPrice || 0,
          finalStock: newStock,
          maxDiscount: 0,
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
