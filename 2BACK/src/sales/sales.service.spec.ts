import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SalesService } from './sales.service';
import { StockService } from '../product/stock.service';
import { ProductEntity } from '../entities/product.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { SaleEntity } from '../entities/sale.entity';

describe('SalesService', () => {
  let service: SalesService;
  let transactionRepository: Repository<TransactionEntity>;
  let salesRepository: Repository<SaleEntity>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let dataSource: jest.Mocked<DataSource>;

  const mockProduct = (overrides: Partial<ProductEntity> = {}): ProductEntity => ({
    id: 1,
    name: 'test product',
    active: true,
    stock: 10,
    minimum: 5,
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
        SalesService,
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
          provide: getRepositoryToken(SaleEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
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

    service = module.get<SalesService>(SalesService);
    transactionRepository = module.get<Repository<TransactionEntity>>(
      getRepositoryToken(TransactionEntity),
    );
    salesRepository = module.get<Repository<SaleEntity>>(
      getRepositoryToken(SaleEntity),
    );
    dataSource = module.get<DataSource>(DataSource) as jest.Mocked<DataSource>;

    queryRunner = mockQueryRunner();
    (dataSource.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
  });

  describe('createSale', () => {
    it('should create a sale with snapshot', async () => {
      const transactions: TransactionEntity[] = [
        {
          id: 1,
          operation: 'Venta Producto',
          quantity: -2,
          sellingPrice: 100,
          maxDiscount: 10,
          finalStock: 8,
          assignedWorker: 'worker1',
          createdAt: new Date(),
          description: 'test',
          product: mockProduct({ id: 1 }) as ProductEntity,
        } as TransactionEntity,
      ];

      const savedSale: SaleEntity = {
        id: 1,
        total: 200,
        snapshot: [],
      } as SaleEntity;

      (salesRepository.save as jest.Mock).mockResolvedValue(savedSale);
      (transactionRepository.save as jest.Mock).mockResolvedValue({});

      const result = await service.createSale(transactions, 200);

      expect(result.total).toBe(200);
      expect(salesRepository.save).toHaveBeenCalled();
    });
  });

  describe('createSaleBatch', () => {
    it('should create batch sale with 2 products and return SaleEntity with snapshot', async () => {
      const product1 = mockProduct({ id: 1, name: 'p1', stock: 10 });
      const product2 = mockProduct({ id: 2, name: 'p2', stock: 5 });
      const lastTxP1 = { id: 9, maxDiscount: 500 } as TransactionEntity;

      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(product1)   // stock lock: product 1
        .mockResolvedValueOnce(lastTxP1)   // last transaction: product 1
        .mockResolvedValueOnce(product2)   // stock lock: product 2
        .mockResolvedValueOnce(null);      // last transaction: product 2 (none)

      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const savedSale = { id: 1, total: 1200, snapshot: [] };
      (salesRepository.create as jest.Mock).mockReturnValue(savedSale);
      (queryRunner.manager.save as jest.Mock)
        .mockResolvedValueOnce(savedSale)     // SaleEntity save
        .mockResolvedValueOnce({ id: 101 })   // transaction 1
        .mockResolvedValueOnce({ id: 102 });  // transaction 2

      (transactionRepository.create as jest.Mock)
        .mockReturnValueOnce({ operation: 'Venta Producto', quantity: -2 })
        .mockReturnValueOnce({ operation: 'Venta Producto', quantity: -1 });

      (salesRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        total: 1200,
        snapshot: [
          { productId: 1, quantity: -2, sellingPrice: 500, discount: 0, finalStock: 8 },
          { productId: 2, quantity: -1, sellingPrice: 200, discount: 0, finalStock: 4 },
        ],
        transactions: [{ id: 101 }, { id: 102 }],
      });

      const result = await service.createSaleBatch({
        products: [
          { productId: 1, quantity: -2, sellingPrice: 500 },
          { productId: 2, quantity: -1, sellingPrice: 200 },
        ],
        total: 1200,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.total).toBe(1200);
      expect(result.snapshot).toHaveLength(2);
      // Sale transactions must carry over the product's maxDiscount policy
      expect(transactionRepository.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ maxDiscount: 500 }),
      );
      expect(transactionRepository.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ maxDiscount: 0 }),
      );
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('should rollback ALL if one product has insufficient stock (409)', async () => {
      const product1 = mockProduct({ id: 1, stock: 2 });

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValueOnce(product1);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 0 });

      const savedSale = { id: 1, total: 1000, snapshot: [] };
      (salesRepository.create as jest.Mock).mockReturnValue(savedSale);
      (queryRunner.manager.save as jest.Mock).mockResolvedValueOnce(savedSale);

      await expect(
        service.createSaleBatch({
          products: [
            { productId: 1, quantity: -5, sellingPrice: 200 },
            { productId: 2, quantity: -1, sellingPrice: 200 },
          ],
          total: 1000,
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

      const savedSale = { id: 1, total: 200, snapshot: [] };
      (salesRepository.create as jest.Mock).mockReturnValue(savedSale);
      (queryRunner.manager.save as jest.Mock).mockResolvedValueOnce(savedSale);

      await expect(
        service.createSaleBatch({
          products: [{ productId: 999, quantity: -1, sellingPrice: 200 }],
          total: 200,
        }),
      ).rejects.toThrow(
        new HttpException('Product with ID 999 not found', HttpStatus.NOT_FOUND),
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw 400 when products array is empty', async () => {
      await expect(
        service.createSaleBatch({
          products: [],
          total: 0,
        }),
      ).rejects.toThrow(
        new HttpException(
          'At least one product is required',
          HttpStatus.BAD_REQUEST,
        ),
      );

      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should throw 400 when a product is missing quantity', async () => {
      await expect(
        service.createSaleBatch({
          products: [{ productId: 1 } as any],
          total: 0,
        }),
      ).rejects.toThrow(
        new HttpException(
          'Each product requires productId and quantity',
          HttpStatus.BAD_REQUEST,
        ),
      );

      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should throw 400 when a product is missing productId', async () => {
      await expect(
        service.createSaleBatch({
          products: [{ quantity: -1 } as any],
          total: 0,
        }),
      ).rejects.toThrow(
        new HttpException(
          'Each product requires productId and quantity',
          HttpStatus.BAD_REQUEST,
        ),
      );

      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should populate sale.snapshot with per-product data', async () => {
      const product1 = mockProduct({ id: 1, name: 'widget', stock: 10 });

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValueOnce(product1);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const savedSale = { id: 1, total: 500, snapshot: [] };
      (salesRepository.create as jest.Mock).mockReturnValue(savedSale);

      // Capture snapshot passed to update
      let capturedSnapshot: any = null;
      (queryRunner.manager.update as jest.Mock).mockImplementation(
        (_entity: any, _id: any, data: any) => {
          capturedSnapshot = data.snapshot;
          return { affected: 1 };
        },
      );

      (queryRunner.manager.save as jest.Mock)
        .mockResolvedValueOnce(savedSale)
        .mockResolvedValueOnce({ id: 101 });

      (transactionRepository.create as jest.Mock).mockReturnValue({
        operation: 'Venta Producto',
        quantity: -2,
      });

      (salesRepository.findOne as jest.Mock).mockImplementation(() => ({
        id: 1,
        total: 500,
        snapshot: capturedSnapshot,
        transactions: [{ id: 101 }],
      }));

      const result = await service.createSaleBatch({
        products: [{ productId: 1, quantity: -2, sellingPrice: 250, purchaseDiscount: 10 }],
        total: 500,
      });

      expect(result.snapshot).toHaveLength(1);
      expect(result.snapshot![0]).toMatchObject({
        productId: 1,
        quantity: -2,
        sellingPrice: 250,
        discount: 10,
      });
      expect(result.snapshot![0].finalStock).toBeDefined();
    });
  });
});
