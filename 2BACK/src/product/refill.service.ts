import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProductEntity } from '../entities/product.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { RefillGroupEntity } from '../entities/refill-group.entity';
import { OrderEntity } from '../entities/order.entity';
import { UserEntity } from '../entities/user.entity';
import { StockService } from './stock.service';

/**
 * Spare-part refill domain: atomic batch refills (RefillGroup) tied to
 * service orders and technicians. Stock mutations always go through
 * StockService.mutateStock() inside a single QueryRunner transaction.
 */
@Injectable()
export class RefillService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,

    @InjectRepository(RefillGroupEntity)
    private readonly refillGroupRepository: Repository<RefillGroupEntity>,

    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    private readonly dataSource: DataSource,

    private readonly stockService: StockService,
  ) {}

  /**
   * Create a RefillGroup with multiple product transactions in a single
   * atomic operation. If any product fails (insufficient stock, not found),
   * the entire batch is rolled back — zero partial commits.
   */
  async createRefillBatch(body: {
    products: Array<{
      productId: number;
      quantity: number;
      operation: string;
      description?: string;
      sellingPrice?: number;
      costPrice?: number;
    }>;
    technicianId?: number;
    orderId?: number;
    totalValue?: number;
    snapshotData?: Record<string, any>;
  }): Promise<RefillGroupEntity> {
    // FIX 1 + FIX 3: Validate input before any DB work
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
      // Resolve optional order and technician within the transaction
      let order: OrderEntity | null = null;
      if (body.orderId) {
        order = await queryRunner.manager.findOne(OrderEntity, { where: { id: body.orderId } });
        if (!order) {
          throw new HttpException(
            `Order with ID ${body.orderId} not found`,
            HttpStatus.NOT_FOUND,
          );
        }
      }

      let technician: UserEntity | null = null;
      if (body.technicianId) {
        technician = await queryRunner.manager.findOne(UserEntity, { where: { id: body.technicianId } });
        if (!technician) {
          throw new HttpException(
            `User with ID ${body.technicianId} not found`,
            HttpStatus.NOT_FOUND,
          );
        }
      }

      // Compute totalValue from products if not provided
      const totalValue = body.totalValue ?? body.products.reduce(
        (sum, p) => sum + ((p.sellingPrice ?? 0) * Math.abs(p.quantity ?? 0)),
        0,
      );

      // Create RefillGroup entity
      const refillGroup = this.refillGroupRepository.create({
        totalValue,
        order: order ?? undefined,
        technician: technician ?? undefined,
      });

      // Save RefillGroup within the transaction
      const savedGroup = await queryRunner.manager.save(refillGroup);

      const transactions: TransactionEntity[] = [];

      // Process each product in sequence within the same transaction
      for (const productData of body.products) {
        const { newStock } = await this.stockService.mutateStock(
          queryRunner,
          productData.productId,
          productData.quantity,
        );

        const newTransaction = this.transactionRepository.create({
          operation: productData.operation || 'Asignación Repuesto Producto',
          quantity: productData.quantity,
          costPrice: Number(productData.costPrice) || 0,
          sellingPrice: Number(productData.sellingPrice) || 0,
          location: 'Sin Datos',
          payMethod: 'Sin Datos',
          finalStock: newStock,
          maxDiscount: 0,
          purchaseDiscount: 0,
          description: productData.description || '',
          snapshotData: body.snapshotData ?? {},
          createdAt: new Date(),
          product: { id: productData.productId } as ProductEntity,
          refillGroup: savedGroup,
        });

        const savedTx = await queryRunner.manager.save(newTransaction);
        transactions.push(savedTx);
      }

      await queryRunner.commitTransaction();

      // Re-fetch with relations
      return (await this.refillGroupRepository.findOne({
        where: { id: savedGroup.id },
        relations: { transactions: true, order: true, technician: true },
      }))!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
