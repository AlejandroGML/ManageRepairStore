import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner, EntityManager } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { StockService } from './stock.service';
import { ProductEntity } from '../entities/product.entity';
import { TransactionEntity } from '../entities/transaction.entity';

describe('StockService', () => {
  let service: StockService;
  let queryRunner: jest.Mocked<QueryRunner>;

  const mockProduct = (overrides: Partial<ProductEntity> = {}): ProductEntity => ({
    id: 1,
    name: 'test product',
    active: true,
    stock: 10,
    minimum: 0,
    costPrice: 0,
    sellingPrice: 0,
    maxDiscount: 0,
    location: '',
    description: '',
    image: null,
    transactions: [],
    ...overrides,
  });

  const mockQueryRunner = (): jest.Mocked<QueryRunner> => {
    const manager = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    return {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager,
      isTransactionActive: true,
      dataSource: {} as DataSource,
      hasTransaction: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<QueryRunner>;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
    queryRunner = mockQueryRunner();
  });

  describe('mutateStock', () => {
    it('should return previousStock/newStock and persist the new stock (happy path)', async () => {
      const product = mockProduct({ id: 1, stock: 10 });

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.mutateStock(queryRunner, 1, 5);

      expect(result).toEqual({ previousStock: 10, newStock: 15 });
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        ProductEntity,
        1,
        { stock: 15 },
      );
    });

    it('should allow stock to reach exactly zero', async () => {
      const product = mockProduct({ id: 1, stock: 3 });

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.mutateStock(queryRunner, 1, -3);

      expect(result).toEqual({ previousStock: 3, newStock: 0 });
    });

    it('should lock the row with pessimistic_write', async () => {
      const product = mockProduct({ id: 1, stock: 10 });

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });

      await service.mutateStock(queryRunner, 1, 1);

      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(ProductEntity, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('should throw 404 when product not found', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.mutateStock(queryRunner, 999, 1)).rejects.toThrow(
        new HttpException('Product with ID 999 not found', HttpStatus.NOT_FOUND),
      );

      expect(queryRunner.manager.update).not.toHaveBeenCalled();
    });

    it('should throw 409 when new stock would be negative', async () => {
      const product = mockProduct({ id: 1, stock: 3 });

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);

      await expect(service.mutateStock(queryRunner, 1, -5)).rejects.toThrow(
        new HttpException(
          'Insufficient stock to complete the operation',
          HttpStatus.CONFLICT,
        ),
      );

      expect(queryRunner.manager.update).not.toHaveBeenCalled();
    });
  });

  describe('getLastTransaction', () => {
    it('should return the newest non-deleted transaction', () => {
      const older = {
        id: 1,
        deleted: false,
        createdAt: new Date('2026-01-01T10:00:00Z'),
      } as TransactionEntity;
      const newest = {
        id: 2,
        deleted: false,
        createdAt: new Date('2026-02-01T10:00:00Z'),
      } as TransactionEntity;
      const deletedNewest = {
        id: 3,
        deleted: true,
        createdAt: new Date('2026-03-01T10:00:00Z'),
      } as TransactionEntity;

      const product = mockProduct({ transactions: [deletedNewest, older, newest] });

      expect(service.getLastTransaction(product)).toBe(newest);
    });

    it('should return undefined when product has no transactions', () => {
      expect(service.getLastTransaction(mockProduct({ transactions: [] }))).toBeUndefined();
      expect(service.getLastTransaction(mockProduct({ transactions: undefined }))).toBeUndefined();
    });

    it('should return undefined when all transactions are deleted', () => {
      const deleted = {
        id: 1,
        deleted: true,
        createdAt: new Date('2026-01-01T10:00:00Z'),
      } as TransactionEntity;

      expect(service.getLastTransaction(mockProduct({ transactions: [deleted] }))).toBeUndefined();
    });
  });
});
