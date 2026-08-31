import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { ProductEntity } from '../entities/product.entity';
import { TransactionEntity } from '../entities/transaction.entity';

/**
 * Shared stock-mutation primitives.
 *
 * ProductEntity.stock is the single source of truth for inventory — every
 * stock change in the app goes through mutateStock().
 */
@Injectable()
export class StockService {
  constructor(private readonly dataSource: DataSource) {}

  // Obtener la última transacción de un producto
  getLastTransaction(product: ProductEntity): TransactionEntity | undefined {
    // Verificar que transactions esté definido y no sea null
    if (!product.transactions || product.transactions.length === 0) {
      return undefined;
    }
    return product.transactions
      .filter(t => t.deleted === false) // Filtrar solo transacciones activas
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))[0];
  }

  /**
   * Atomically mutate product stock within a QueryRunner transaction.
   * Uses SELECT ... FOR UPDATE to prevent race conditions.
   *
   * @returns { previousStock, newStock }
   * @throws HttpException(409) if new stock would be negative
   */
  async mutateStock(
    queryRunner: QueryRunner,
    productId: number,
    delta: number,
  ): Promise<{ previousStock: number; newStock: number }> {
    const product = await queryRunner.manager.findOne(ProductEntity, {
      where: { id: productId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!product) {
      throw new HttpException(
        `Product with ID ${productId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const previousStock = product.stock;
    const newStock = previousStock + delta;

    if (newStock < 0) {
      throw new HttpException(
        'Insufficient stock to complete the operation',
        HttpStatus.CONFLICT,
      );
    }

    await queryRunner.manager.update(ProductEntity, productId, {
      stock: newStock,
    });

    return { previousStock, newStock };
  }
}
