import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ProductService } from './product.service';
import { StockService } from './stock.service';
import { ProductEntity } from '../entities/product.entity';
import { TransactionEntity } from '../entities/transaction.entity';

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: Repository<ProductEntity>;
  let transactionRepository: Repository<TransactionEntity>;
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
      find: jest.fn().mockResolvedValue([]),
      query: jest.fn().mockResolvedValue([]),
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
        ProductService,
        StockService,
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
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

    service = module.get<ProductService>(ProductService);
    productRepository = module.get<Repository<ProductEntity>>(
      getRepositoryToken(ProductEntity),
    );
    transactionRepository = module.get<Repository<TransactionEntity>>(
      getRepositoryToken(TransactionEntity),
    );
    dataSource = module.get<DataSource>(DataSource) as jest.Mocked<DataSource>;

    queryRunner = mockQueryRunner();
    (dataSource.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
  });

  describe('mutateStock (via addTransactionToProduct)', () => {
    it('should add stock (positive delta) and return 200', async () => {
      const product = mockProduct({ id: 1, stock: 10 });
      const productAfterUpdate = mockProduct({ id: 1, stock: 15 });

      // First findOne: lookup product
      (productRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(product)   // initial lookup in addTransactionToProduct
        .mockResolvedValueOnce(productAfterUpdate);  // re-fetch after commit

      // mutateStock findOne
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (queryRunner.manager.save as jest.Mock).mockResolvedValue({});
      (transactionRepository.create as jest.Mock).mockReturnValue({
        operation: 'Devolución Repuesto Producto',
        quantity: 5,
        finalStock: 15,
      } as Partial<TransactionEntity>);

      const result = await service.addTransactionToProduct(1, {
        operation: 'Devolución Repuesto Producto',
        quantity: 5,
        sellingPrice: 100,
        costPrice: 50,
      });

      expect(result.stock).toBe(15);
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('should persist minimum and categoryId on product update', async () => {
      const product = mockProduct({ id: 1, stock: 10, minimum: 0 });
      const productAfterUpdate = mockProduct({ id: 1, stock: 12, minimum: 3 });

      (productRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(productAfterUpdate);
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (queryRunner.manager.save as jest.Mock).mockResolvedValue({});
      (transactionRepository.create as jest.Mock).mockReturnValue({} as Partial<TransactionEntity>);

      await service.addTransactionToProduct(1, {
        operation: 'Actualización Producto',
        quantity: 2,
        sellingPrice: 100,
        minimum: 3,
        categoryId: 7,
      });

      const updateArgs = (queryRunner.manager.update as jest.Mock).mock.calls.find(
        (c) => c[0] === ProductEntity && c[2] && 'minimum' in c[2]
      );
      expect(updateArgs).toBeDefined();
      expect(updateArgs[2]).toMatchObject({ name: expect.any(String), minimum: 3, category: { id: 7 } });
    });

    it('should subtract stock (negative delta) and return 200', async () => {
      const product = mockProduct({ id: 1, stock: 10 });
      const productAfterUpdate = mockProduct({ id: 1, stock: 7 });

      (productRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(productAfterUpdate);

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (queryRunner.manager.save as jest.Mock).mockResolvedValue({});
      (transactionRepository.create as jest.Mock).mockReturnValue({
        operation: 'Venta Producto',
        quantity: -3,
        finalStock: 7,
      } as Partial<TransactionEntity>);

      const result = await service.addTransactionToProduct(1, {
        operation: 'Venta Producto',
        quantity: -3,
      });

      expect(result.stock).toBe(7);
    });

    it('should reject insufficient stock with 409', async () => {
      const product = mockProduct({ id: 1, stock: 3 });

      (productRepository.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 0 });

      await expect(
        service.addTransactionToProduct(1, {
          operation: 'Venta Producto',
          quantity: -5,
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

    it('should handle zero stock exactly (stock goes to 0)', async () => {
      const product = mockProduct({ id: 1, stock: 3 });
      const productAfterUpdate = mockProduct({ id: 1, stock: 0 });

      (productRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(productAfterUpdate);

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (queryRunner.manager.save as jest.Mock).mockResolvedValue({});
      (transactionRepository.create as jest.Mock).mockReturnValue({
        operation: 'Venta Producto',
        quantity: -3,
        finalStock: 0,
      } as Partial<TransactionEntity>);

      const result = await service.addTransactionToProduct(1, {
        operation: 'Venta Producto',
        quantity: -3,
      });

      expect(result.stock).toBe(0);
    });

    it('should ignore stale finalStock from frontend request', async () => {
      const product = mockProduct({ id: 1, stock: 10 });
      const productAfterUpdate = mockProduct({ id: 1, stock: 7 });

      (productRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(productAfterUpdate);

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });

      let savedTransaction: any = null;
      (queryRunner.manager.save as jest.Mock).mockImplementation((entity) => {
        savedTransaction = entity;
      });
      (transactionRepository.create as jest.Mock).mockImplementation(
        (data: any) => ({
          ...data,
          id: 100,
        }),
      );

      // Send stale finalStock=42 — it must be ignored
      await service.addTransactionToProduct(1, {
        operation: 'Venta Producto',
        quantity: -3,
        finalStock: 42,  // stale value from frontend — should be ignored
      });

      // Verify finalStock was set to the server-computed value (7), not 42
      expect(savedTransaction.finalStock).toBe(7);
    });

    it('should throw 404 when product not found', async () => {
      (productRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addTransactionToProduct(999, {
          operation: 'Venta Producto',
          quantity: -1,
        }),
      ).rejects.toThrow(
        new HttpException('Product with ID 999 not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('registerProduct', () => {
    const newProductWith = (name: string, quantity: number): ProductEntity => ({
      name,
      active: true,
      stock: 0,
      minimum: 0,
      costPrice: 0,
      sellingPrice: 0,
      maxDiscount: 0,
      location: '',
      description: '',
      transactions: [
        {
          operation: 'Nuevo Producto',
          quantity,
          finalStock: 0,
          costPrice: 50,
          sellingPrice: 100,
          location: 'A1',
          payMethod: '',
          maxDiscount: 0,
          purchaseDiscount: 0,
          description: '',
          assignedWorker: '',
        } as TransactionEntity,
      ],
    });

    it('should set product.stock = quantity for new product', async () => {
      const newProduct = newProductWith('nuevo producto', 5);

      // No active normalized conflict
      (queryRunner.manager.find as jest.Mock).mockResolvedValue([]);
      // Atomic save inside the transaction returns the product with id
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (p: ProductEntity) => ({ ...p, id: 1 }),
      );
      // Post-commit re-fetch with relations
      (productRepository.findOne as jest.Mock).mockResolvedValue({
        ...newProduct,
        id: 1,
        stock: 5,
        transactions: [{ ...newProduct.transactions[0], finalStock: 5 }],
      });

      const result = await service.registerProduct(newProduct);

      expect(result.stock).toBe(5);
      expect(result.minimum).toBe(0); // new products default the reorder threshold to 0
      expect(result.transactions?.[0]?.finalStock).toBe(5);
    });

    it('should set product.stock = 0 when quantity is 0', async () => {
      const newProduct = newProductWith('producto sin stock', 0);

      (queryRunner.manager.find as jest.Mock).mockResolvedValue([]);
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (p: ProductEntity) => ({ ...p, id: 2 }),
      );
      (productRepository.findOne as jest.Mock).mockResolvedValue({
        ...newProduct,
        id: 2,
        stock: 0,
      });

      const result = await service.registerProduct(newProduct);

      expect(result.stock).toBe(0);
    });

    it('should save through the transaction manager, not the repository (atomic write)', async () => {
      const newProduct = newProductWith('producto atomico', 3);

      (queryRunner.manager.find as jest.Mock).mockResolvedValue([]);
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (p: ProductEntity) => ({ ...p, id: 9 }),
      );
      (productRepository.findOne as jest.Mock).mockResolvedValue({
        ...newProduct,
        id: 9,
      });

      await service.registerProduct(newProduct);

      // J2: the write must happen INSIDE the open transaction
      expect(queryRunner.manager.save).toHaveBeenCalledWith(newProduct);
      expect(productRepository.save).not.toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('should take the advisory lock on the normalized name before recheck and save', async () => {
      const newProduct = newProductWith('Taladro Percutor', 2);

      (queryRunner.manager.find as jest.Mock).mockResolvedValue([]);
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (p: ProductEntity) => ({ ...p, id: 3 }),
      );
      (productRepository.findOne as jest.Mock).mockResolvedValue({
        ...newProduct,
        id: 3,
      });

      await service.registerProduct(newProduct);

      // Guard order: advisory lock → in-tx recheck → write
      expect(queryRunner.manager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        ['taladro percutor'],
      );
      const queryOrder = (queryRunner.manager.query as jest.Mock).mock.invocationCallOrder[0];
      const findOrder = (queryRunner.manager.find as jest.Mock).mock.invocationCallOrder[0];
      const saveOrder = (queryRunner.manager.save as jest.Mock).mock.invocationCallOrder[0];
      expect(queryOrder).toBeLessThan(findOrder);
      expect(findOrder).toBeLessThan(saveOrder);
    });

    it('should reject 409 when an active product normalizes to the same name', async () => {
      const newProduct = newProductWith('VALVULA  X', 4);
      // Accent + case + double-space variants all normalize to 'valvula x'
      const existing = mockProduct({ id: 7, name: 'Válvula X' });

      (queryRunner.manager.find as jest.Mock).mockResolvedValue([existing]);

      await expect(service.registerProduct(newProduct)).rejects.toThrow(
        new HttpException(
          'Ya existe un producto similar: "Válvula X" (#7)',
          HttpStatus.CONFLICT,
        ),
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('should not block registration on inactive (soft-deleted) products', async () => {
      const newProduct = newProductWith('producto reingresado', 1);

      // The recheck only queries active products (where: { active: true })
      (queryRunner.manager.find as jest.Mock).mockResolvedValue([]);
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (p: ProductEntity) => ({ ...p, id: 5 }),
      );
      (productRepository.findOne as jest.Mock).mockResolvedValue({
        ...newProduct,
        id: 5,
      });

      const result = await service.registerProduct(newProduct);

      expect(result.id).toBe(5);
      expect(queryRunner.manager.find).toHaveBeenCalledWith(ProductEntity, {
        where: { active: true },
        select: { id: true, name: true },
      });
    });

    it('should store the product name lowercased (display convention preserved)', async () => {
      const newProduct = newProductWith('Amortiguador Delantero', 2);

      (queryRunner.manager.find as jest.Mock).mockResolvedValue([]);
      let savedProduct: any = null;
      (queryRunner.manager.save as jest.Mock).mockImplementation(async (p: any) => {
        savedProduct = p;
        return { ...p, id: 6 };
      });
      (productRepository.findOne as jest.Mock).mockResolvedValue({
        ...newProduct,
        id: 6,
      });

      await service.registerProduct(newProduct);

      expect(savedProduct.name).toBe('amortiguador delantero');
    });
  });

  describe('updateProductById — rename guard', () => {
    const updateWithName = (name: string): Partial<ProductEntity> => ({
      name,
      transactions: [
        {
          operation: 'Producto Actualizado',
          quantity: 1,
        } as TransactionEntity,
      ],
    });

    it('should reject 409 when renaming onto an existing normalized name', async () => {
      const existing = mockProduct({ id: 12, name: 'freno disco' });

      (queryRunner.manager.find as jest.Mock).mockResolvedValue([existing]);

      await expect(
        service.updateProductById(1, updateWithName('FRENO  DISCO')),
      ).rejects.toThrow(
        new HttpException(
          'Ya existe un producto similar: "freno disco" (#12)',
          HttpStatus.CONFLICT,
        ),
      );

      // Guard fired inside the transaction: rolled back, nothing written
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.manager.update).not.toHaveBeenCalled();
    });

    it('should not take the name lock when the update does not rename', async () => {
      const product = mockProduct({ id: 1, stock: 10 });
      const productAfterUpdate = mockProduct({ id: 1, stock: 11 });

      (productRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(productAfterUpdate);

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (queryRunner.manager.save as jest.Mock).mockResolvedValue({});
      (transactionRepository.create as jest.Mock).mockReturnValue({});

      await service.updateProductById(1, {
        transactions: [{ operation: 'Producto Actualizado', quantity: 1 } as TransactionEntity],
      });

      expect(queryRunner.manager.query).not.toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should allow renaming to a name that only substring-matches another product', async () => {
      const product = mockProduct({ id: 1, name: 'amortiguador' });
      const others = [mockProduct({ id: 12, name: 'amortiguador delantero' })];

      (queryRunner.manager.find as jest.Mock).mockResolvedValue(others);
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(product);
      (queryRunner.manager.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (queryRunner.manager.save as jest.Mock).mockResolvedValue({});
      (transactionRepository.create as jest.Mock).mockReturnValue({});
      (productRepository.findOne as jest.Mock).mockResolvedValue(product);

      const result = await service.updateProductById(1, updateWithName('Amortiguador'));

      expect(result).toBeDefined();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('existsByNormalizedName', () => {
    it('should return true for an exact normalized match', async () => {
      (productRepository.find as jest.Mock).mockResolvedValue([
        mockProduct({ id: 1, name: 'Válvula de Retención' }),
      ]);

      const result = await service.existsByNormalizedName('valvula de retencion');

      expect(result).toBe(true);
      expect(productRepository.find).toHaveBeenCalledWith({
        where: { active: true },
        select: { id: true, name: true },
      });
    });

    it('should return false for a substring-only match', async () => {
      (productRepository.find as jest.Mock).mockResolvedValue([
        mockProduct({ id: 1, name: 'amortiguador delantero' }),
      ]);

      const result = await service.existsByNormalizedName('amortiguador');

      expect(result).toBe(false);
    });

    it('should return false for an empty name', async () => {
      const result = await service.existsByNormalizedName('   ');

      expect(result).toBe(false);
      expect(productRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('getProductsWithLastTransaction', () => {
    it('should return products with stock column available', async () => {
      const products: ProductEntity[] = [
        {
          id: 1,
          name: 'p1',
          active: true,
          stock: 10,
          minimum: 0,
    costPrice: 0,
    sellingPrice: 0,
    maxDiscount: 0,
    location: '',
    description: '',
          image: null,
          transactions: [
            {
              id: 1,
              operation: 'Venta Producto',
              finalStock: 10,
              createdAt: new Date(),
              quantity: 5,
            } as TransactionEntity,
          ],
        },
      ];

      const queryBuilderMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(products),
      };

      jest
        .spyOn(productRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilderMock as any);

      const result = await service.getProductsWithLastTransaction();

      expect(result).toHaveLength(1);
      // stock should be directly available from the entity
      expect(result[0].stock).toBe(10);
    });

    it('should join the category relation (catalog filter needs it)', async () => {
      const queryBuilderMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockProduct({ id: 1 })]),
      };

      jest
        .spyOn(productRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilderMock as any);

      await service.getProductsWithLastTransaction();

      expect(queryBuilderMock.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.category',
        'category',
      );
    });
  });

  describe('catalog list methods — category relation', () => {
    it('should load category in getActiveProducts', async () => {
      (productRepository.find as jest.Mock).mockResolvedValue([
        mockProduct({ id: 1, category: { id: 1, name: 'Lubricantes' } as any }),
      ]);

      const result = await service.getActiveProducts();

      expect(result[0].category?.name).toBe('Lubricantes');
      expect(productRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: expect.objectContaining({ category: true }),
        }),
      );
    });

    it('should load category in getAllProducts', async () => {
      (productRepository.find as jest.Mock).mockResolvedValue([
        mockProduct({ id: 2, category: { id: 2, name: 'Filtros' } as any }),
      ]);

      const result = await service.getAllProducts();

      expect(result[0].category?.name).toBe('Filtros');
      expect(productRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: expect.objectContaining({ category: true }),
        }),
      );
    });
  });
});
