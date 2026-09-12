import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RefillService } from './refill.service';
import { StockService } from './stock.service';
import { ProductEntity } from '../entities/product.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { RefillGroupEntity } from '../entities/refill-group.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderStatus } from '../order/order-status.enum';
import { UserEntity } from '../entities/user.entity';

describe('RefillService', () => {
  let service: RefillService;
  let transactionRepository: Repository<TransactionEntity>;
  let refillGroupRepository: Repository<RefillGroupEntity>;
  let orderRepository: Repository<OrderEntity>;
  let userRepository: Repository<UserEntity>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let dataSource: jest.Mocked<DataSource>;

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
        RefillService,
        StockService,
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefillGroupEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RefillService>(RefillService);
    transactionRepository = module.get<Repository<TransactionEntity>>(
      getRepositoryToken(TransactionEntity),
    );
    refillGroupRepository = module.get<Repository<RefillGroupEntity>>(
      getRepositoryToken(RefillGroupEntity),
    );
    orderRepository = module.get<Repository<OrderEntity>>(
      getRepositoryToken(OrderEntity),
    );
    userRepository = module.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
    );
    dataSource = module.get<DataSource>(DataSource) as jest.Mocked<DataSource>;

    queryRunner = mockQueryRunner();
    (dataSource.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
  });

  describe('createRefillBatch', () => {
    it('should create batch with 2 products and return RefillGroup', async () => {
      const product1 = mockProduct({ id: 1, stock: 10 });
      const product2 = mockProduct({ id: 2, stock: 5 });

      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(product1)   // mutateStock for product 1
        .mockResolvedValueOnce(product2);  // mutateStock for product 2

      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });

      // Mock manager.save for RefillGroup (first call) and transactions (subsequent)
      const savedGroup = { id: 1, totalValue: 0 };
      (queryRunner.manager.save as jest.Mock)
        .mockResolvedValueOnce(savedGroup)      // RefillGroup save
        .mockResolvedValueOnce({ id: 101 })     // transaction 1
        .mockResolvedValueOnce({ id: 102 });    // transaction 2

      (refillGroupRepository.create as jest.Mock).mockReturnValue(savedGroup);

      // Re-fetch after commit
      (refillGroupRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        totalValue: 0,
        transactions: [{ id: 101 }, { id: 102 }],
      });

      (transactionRepository.create as jest.Mock)
        .mockReturnValueOnce({ operation: 'Asignación Repuesto Producto', quantity: -3 })
        .mockReturnValueOnce({ operation: 'Devolución Repuesto Producto', quantity: 3 });

      const result = await service.createRefillBatch({
        products: [
          { productId: 1, quantity: -3, operation: 'Asignación Repuesto Producto' },
          { productId: 2, quantity: 3, operation: 'Devolución Repuesto Producto' },
        ],
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('should rollback ALL if one product has insufficient stock', async () => {
      const product1 = mockProduct({ id: 1, stock: 3 });

      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(product1); // first product: stock=3, but delta=-5

      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 0 });

      // Still need to mock the RefillGroup save (it happens before products are processed)
      (queryRunner.manager.save as jest.Mock).mockResolvedValueOnce({ id: 1 });
      (refillGroupRepository.create as jest.Mock).mockReturnValue({ id: 1 });

      await expect(
        service.createRefillBatch({
          products: [
            { productId: 1, quantity: -5, operation: 'Asignación Repuesto Producto' },
            { productId: 2, quantity: -2, operation: 'Asignación Repuesto Producto' },
          ],
        }),
      ).rejects.toThrow(
        new HttpException(
          'Insufficient stock to complete the operation',
          HttpStatus.CONFLICT,
        ),
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should throw 404 for invalid product ID in batch', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);
      (queryRunner.manager.save as jest.Mock).mockResolvedValueOnce({ id: 1 });
      (refillGroupRepository.create as jest.Mock).mockReturnValue({ id: 1 });

      await expect(
        service.createRefillBatch({
          products: [
            { productId: 999, quantity: 1, operation: 'Devolución Repuesto Producto' },
          ],
        }),
      ).rejects.toThrow(
        new HttpException('Product with ID 999 not found', HttpStatus.NOT_FOUND),
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should link batch to an order when orderId is provided', async () => {
      const product = mockProduct({ id: 1, stock: 10 });

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const mockOrder = { id: 42, status: OrderStatus.PENDIENTE } as OrderEntity;
      (orderRepository.findOne as jest.Mock).mockResolvedValue(mockOrder);

      const savedGroup = { id: 1, totalValue: 0, order: mockOrder };
      (refillGroupRepository.create as jest.Mock).mockReturnValue(savedGroup);
      (queryRunner.manager.save as jest.Mock)
        .mockResolvedValueOnce(savedGroup)        // RefillGroup save
        .mockResolvedValueOnce({ id: 101 });      // transaction save

      (refillGroupRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        totalValue: 0,
        order: mockOrder,
        transactions: [{ id: 101 }],
      });

      (transactionRepository.create as jest.Mock).mockReturnValue({
        operation: 'Asignación Repuesto Producto',
        quantity: -2,
      });

      const result = await service.createRefillBatch({
        products: [
          { productId: 1, quantity: -2, operation: 'Asignación Repuesto Producto' },
        ],
        orderId: 42,
      });

      expect(result.order).toBeDefined();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should link batch to a technician when technicianId is provided', async () => {
      const product = mockProduct({ id: 1, stock: 10 });

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const mockTechnician = { id: 7, name: 'Technician Joe' } as UserEntity;
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockTechnician);

      const savedGroup = { id: 1, totalValue: 0, technician: mockTechnician };
      (refillGroupRepository.create as jest.Mock).mockReturnValue(savedGroup);
      (queryRunner.manager.save as jest.Mock)
        .mockResolvedValueOnce(savedGroup)        // RefillGroup save
        .mockResolvedValueOnce({ id: 101 });      // transaction save

      (refillGroupRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        totalValue: 0,
        technician: mockTechnician,
        transactions: [{ id: 101 }],
      });

      (transactionRepository.create as jest.Mock).mockReturnValue({
        operation: 'Asignación Repuesto Producto',
        quantity: -1,
      });

      const result = await service.createRefillBatch({
        products: [
          { productId: 1, quantity: -1, operation: 'Asignación Repuesto Producto' },
        ],
        technicianId: 7,
      });

      expect(result.technician).toBeDefined();
      expect(result.technician?.name).toBe('Technician Joe');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should compute totalValue from provided value', async () => {
      const product1 = mockProduct({ id: 1, stock: 10 });
      const product2 = mockProduct({ id: 2, stock: 5 });

      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);

      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const savedGroup = { id: 1, totalValue: 230 };
      (refillGroupRepository.create as jest.Mock).mockReturnValue(savedGroup);
      (queryRunner.manager.save as jest.Mock)
        .mockResolvedValueOnce(savedGroup)
        .mockResolvedValueOnce({ id: 101 })
        .mockResolvedValueOnce({ id: 102 });

      (refillGroupRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        totalValue: 230,
        transactions: [{ id: 101 }, { id: 102 }],
      });

      (transactionRepository.create as jest.Mock)
        .mockReturnValueOnce({ operation: 'Asignación Repuesto Producto', quantity: -3 })
        .mockReturnValueOnce({ operation: 'Asignación Repuesto Producto', quantity: -2 });

      const result = await service.createRefillBatch({
        products: [
          { productId: 1, quantity: -3, operation: 'Asignación Repuesto Producto', sellingPrice: 50 },
          { productId: 2, quantity: -2, operation: 'Asignación Repuesto Producto', sellingPrice: 40 },
        ],
        totalValue: 230,
      });

      expect(result.totalValue).toBe(230);
      expect(refillGroupRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalValue: 230 }),
      );
    });
  });
});
