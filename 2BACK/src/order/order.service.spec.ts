import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ClientEntity } from '../entities/client.entity';
import { CompanyEntity } from '../entities/company.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderStatus } from './order-status.enum';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let queryRunner: jest.Mocked<QueryRunner>;
  let dataSource: jest.Mocked<DataSource>;
  let orderRepository: Repository<OrderEntity>;

  const mockOrder = (overrides: Partial<OrderEntity> = {}): OrderEntity => ({
    description: 'fix leak',
    status: OrderStatus.PENDIENTE,
    total: 0,
    ...overrides,
  });

  const mockQueryRunner = (): jest.Mocked<QueryRunner> => {
    const manager = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((_entityType: any, data: any) =>
        Promise.resolve({ id: 999, ...data }),
      ),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
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

  const makeClient = (overrides: Partial<ClientEntity> = {}): ClientEntity => ({
    name: 'Abagas Toledo',
    rut_raw: '12345678-5',
    rut_normalizado: '12345678-5',
    address: 'Toledo 123',
    city: 'Santiago',
    active: true,
    company_id: null,
    company: null as any,
    orders: [mockOrder()],
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(ClientEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CompanyEntity),
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
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

    service = module.get<OrderService>(OrderService);
    dataSource = module.get<DataSource>(DataSource) as jest.Mocked<DataSource>;
    orderRepository = module.get<Repository<OrderEntity>>(getRepositoryToken(OrderEntity));

    queryRunner = mockQueryRunner();
    (dataSource.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
  });

  describe('findRecent', () => {
    const recentOrder = {
      id: 59343,
      status: 'Pendiente',
      total: 15000,
      client: { id: 1, name: 'cliente uno' },
    } as unknown as OrderEntity;

    const buildQb = (): any => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(8123),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([recentOrder]),
    });

    it('should return the latest orders with client relation and total', async () => {
      const qb = buildQb();
      jest.spyOn(orderRepository, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.findRecent(6);

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('o.client', 'c');
      expect(qb.orderBy).toHaveBeenCalledWith('o.id', 'DESC');
      expect(qb.take).toHaveBeenCalledWith(6);
      expect(result.total).toBe(8123);
      expect(result.items).toEqual([recentOrder]);
    });

    it('should cap the limit at 20 and default to 1 minimum', async () => {
      const qb = buildQb();
      jest.spyOn(orderRepository, 'createQueryBuilder').mockReturnValue(qb as any);

      await service.findRecent(500);
      expect(qb.take).toHaveBeenCalledWith(20);

      await service.findRecent(0);
      expect(qb.take).toHaveBeenCalledWith(1);
    });
  });

  describe('registerClientOrder — matching', () => {
    const existingClient: ClientEntity = {
      id: 10,
      name: 'Abagas Toledo',
      rut_raw: '12.345.678-5',
      rut_normalizado: '12345678-5',
      address: 'Toledo 123',
      city: 'Santiago',
      active: true,
      company_id: 1,
      company: null as any,
    };

    it('should match by normalized RUT + name (ilower, trimmed) when rut_normalizado is available', async () => {
      const incoming: ClientEntity = {
        ...makeClient({ rut_normalizado: '12345678-5', rut_raw: '12345678-5', name: '  Abagas Toledo  ' }),
      };

      const matchedClient = { ...existingClient, rut_raw: '12345678-5' };
      const normalizedWhere = {
        name: 'abagas toledo',
        rut_normalizado: '12345678-5',
        active: true,
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValueOnce(matchedClient);

      const result = await service.registerClientOrder(incoming);

      // Should match via normalized RUT + name first
      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(ClientEntity, {
        where: normalizedWhere,
        lock: { mode: 'pessimistic_write' },
      });
      expect(queryRunner.manager.findOne).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(10);
      expect(result.name).toBe('Abagas Toledo');
    });

    it('should fallback to rut_raw + name when no normalized RUT match found', async () => {
      const incoming: ClientEntity = {
        ...makeClient({ rut_normalizado: '12345678-5', rut_raw: '12345678-5', name: 'Abagas Toledo' }),
      };

      const matchedClient = { ...existingClient, rut_raw: '12345678-5' };

      // First call (normalized) returns null — no match
      // Second call (rut_raw fallback) returns the client
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // normalized match fails
        .mockResolvedValueOnce(matchedClient); // raw RUT match succeeds

      const result = await service.registerClientOrder(incoming);

      expect(result.id).toBe(10);
      // Should have been called twice: first normalized, then raw
      expect(queryRunner.manager.findOne).toHaveBeenCalledTimes(2);
    });

    it('should fallback to rut_raw + name when rut_normalizado is null/undefined', async () => {
      const incoming: ClientEntity = {
        ...makeClient({ rut_normalizado: undefined, rut_raw: '11111111-1', name: 'Cliente Sin RUT Normalizado' }),
      };

      const matchedClient = {
        ...existingClient,
        id: 99,
        name: 'Cliente Sin RUT Normalizado',
        rut_raw: '11111111-1',
        rut_normalizado: undefined,
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(matchedClient);

      const result = await service.registerClientOrder(incoming);

      // Should match via raw RUT + name (normalized step skipped when null/undefined)
      expect(result.id).toBe(99);
    });

    it('should match by client.id as last resort when both RUT matches fail', async () => {
      const incoming: ClientEntity = {
        ...makeClient({ id: 42, rut_normalizado: '12345678-5', rut_raw: '99999999-9', name: 'Abagas Toledo' }),
      };

      const idMatch: ClientEntity = {
        ...existingClient, id: 42, name: 'Abagas Toledo', rut_raw: '99999999-9',
      };

      // Both normalized and raw RUT matches fail
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // normalized
        .mockResolvedValueOnce(null) // raw
        .mockResolvedValueOnce(idMatch); // id match

      const result = await service.registerClientOrder(incoming);

      expect(result.id).toBe(42);
      expect(queryRunner.manager.findOne).toHaveBeenLastCalledWith(ClientEntity, {
        where: { id: 42, active: true },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('should create new client when no match found at all', async () => {
      const incoming: ClientEntity = {
        ...makeClient({ id: undefined, orders: [], name: 'Nuevo Cliente', rut_raw: '00.000.000-0', rut_normalizado: '00000000-0' }),
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null); // all match attempts return null

      const result = await service.registerClientOrder(incoming);

      expect(result.id).toBe(999);
      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        ClientEntity,
        expect.objectContaining({ name: 'Nuevo Cliente' }),
      );
    });

    it('should disambiguate multiple branches sharing same normalized RUT by matching name', async () => {
      const incoming: ClientEntity = {
        ...makeClient({ rut_normalizado: '76042014-K', rut_raw: '76042014-K', name: 'Walmart Viña' }),
      };

      const branchViña: ClientEntity = {
        id: 50,
        name: 'Walmart Viña',
        rut_raw: '76042014-K',
        rut_normalizado: '76042014-K',
        address: 'Viña del Mar',
        city: 'Viña del Mar',
        active: true,
        company_id: 5,
        company: null as any,
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(branchViña);

      const result = await service.registerClientOrder(incoming);

      // Should match by normalized RUT + name, returning the correct branch
      expect(result.id).toBe(50);
      expect(result.company_id).toBe(5);
      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(ClientEntity, {
        where: {
          name: 'walmart viña',
          rut_normalizado: '76042014-k',
          active: true,
        },
        lock: { mode: 'pessimistic_write' },
      });
    });
  });

  describe('registerClientOrder — transaction integrity', () => {
    it('should rollback on error', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        service.registerClientOrder(makeClient()),
      ).rejects.toThrow('Error registering client order');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should release queryRunner in finally block', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        service.registerClientOrder(makeClient()),
      ).rejects.toThrow();

      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should re-throw HttpExceptions untouched (J1: no 400→500 wrapping)', async () => {
      const guard = new BadRequestException('RUT does not match company');
      (queryRunner.manager.findOne as jest.Mock).mockRejectedValue(guard);

      let caught: any;
      try {
        await service.registerClientOrder(makeClient());
      } catch (err) {
        caught = err;
      }

      // The SAME HttpException travels: no "Error registering client order"
      // wrapper added.
      expect(caught).toBe(guard);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should wrap non-HTTP errors keeping the original as cause', async () => {
      const dbError = new Error('connection reset');
      (queryRunner.manager.findOne as jest.Mock).mockRejectedValue(dbError);

      let caught: any;
      try {
        await service.registerClientOrder(makeClient());
      } catch (err) {
        caught = err;
      }

      expect(caught).not.toBe(dbError);
      expect(caught.message).toContain('Error registering client order');
      expect(caught.cause).toBe(dbError);
    });
  });

  describe('registerClientOrder — order code generation', () => {
    const existingClient: ClientEntity = {
      id: 10,
      name: 'Abagas Toledo',
      rut_raw: '12.345.678-5',
      rut_normalizado: '12345678-5',
      address: 'Toledo 123',
      city: 'Santiago',
      active: true,
      company_id: 1,
      company: null as any,
    };

    it('should assign code ORD-{1000+id} to a new order on an existing client', async () => {
      const incoming: ClientEntity = {
        ...makeClient({
          rut_normalizado: '12345678-5',
          rut_raw: '12345678-5',
          name: 'Abagas Toledo',
        }),
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValueOnce(existingClient);

      const result = await service.registerClientOrder(incoming);

      // manager.save(OrderEntity, ...) mock returns id 999 → code ORD-1999
      expect(queryRunner.manager.update).toHaveBeenCalledWith(OrderEntity, 999, {
        code: 'ORD-1999',
      });
      const lastOrder = result.orders![result.orders!.length - 1];
      expect(lastOrder.code).toBe('ORD-1999');
      expect(lastOrder.total).toBe(0); // default until totals are computed elsewhere
    });

    it('should assign codes to cascaded orders when creating a new client', async () => {
      const incoming: ClientEntity = {
        ...makeClient({
          id: undefined,
          orders: [mockOrder()],
          name: 'Nuevo Cliente',
          rut_raw: '00.000.000-0',
          rut_normalizado: '00000000-0',
        }),
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);

      // Simulate TypeORM cascade: saving the client assigns ids to nested orders
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (entity: any, data: any) => {
          if (entity === ClientEntity) {
            return {
              ...data,
              id: 500,
              orders: (data.orders ?? []).map((o: any, i: number) => ({
                ...o,
                id: 700 + i,
              })),
            };
          }
          return { id: 999, ...data };
        },
      );

      const result = await service.registerClientOrder(incoming);

      expect(queryRunner.manager.update).toHaveBeenCalledWith(OrderEntity, 700, {
        code: 'ORD-1700',
      });
      expect(result.orders?.[0].code).toBe('ORD-1700');
    });

    it('should not generate codes when the incoming order list is empty', async () => {
      const incoming: ClientEntity = {
        ...makeClient({
          rut_normalizado: '12345678-5',
          rut_raw: '12345678-5',
          name: 'Abagas Toledo',
          orders: [],
        }),
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValueOnce(existingClient);

      const result = await service.registerClientOrder(incoming);

      expect(queryRunner.manager.update).not.toHaveBeenCalledWith(
        OrderEntity,
        expect.anything(),
        expect.objectContaining({ code: expect.any(String) }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('registerClientOrder — company resolution', () => {
    const payload = (overrides: any = {}) =>
      makeClient({
        company_id: null,
        company: null as any,
        rut_raw: '11111111-1',
        rut_normalizado: '11111111-1',
        ...overrides,
      });

    it('links an existing company found by meaningful rut when is_company is true', async () => {
      const company = { id: 7, rut_normalizado: '96792430k', name: 'Sodimac', active: true } as CompanyEntity;
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // step 1: rut + name
        .mockResolvedValueOnce(null) // step 2: rut_raw + name
        .mockResolvedValueOnce(company); // resolveCompany: empresa por rut

      await service.registerClientOrder(
        payload({ rut_normalizado: '96792430k', rut_raw: '96792430k', is_company: true }) as any,
      );

      const clientSave = (queryRunner.manager.save as jest.Mock).mock.calls.find(
        (c) => c[0] === ClientEntity,
      );
      expect(clientSave?.[1].company_id).toBe(7);
    });

    it('does NOT link a particular even when the rut matches an existing company', async () => {
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // step 1
        .mockResolvedValueOnce(null); // step 2

      await service.registerClientOrder(
        payload({ rut_normalizado: '96792430k', rut_raw: '96792430k' }) as any,
      );

      const clientSave = (queryRunner.manager.save as jest.Mock).mock.calls.find(
        (c) => c[0] === ClientEntity,
      );
      expect(clientSave?.[1].company_id).toBeNull();
      const companyLookups = (queryRunner.manager.findOne as jest.Mock).mock.calls.filter(
        (c) => c[0] === CompanyEntity,
      );
      expect(companyLookups.length).toBe(0);
    });

    it('rejects a companyId whose rut does not match the company rut', async () => {
      const company = { id: 12, rut_normalizado: '96792430k', name: 'Sodimac', active: true } as CompanyEntity;
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // step 1
        .mockResolvedValueOnce(null) // step 2
        .mockResolvedValueOnce(company); // resolveCompany: empresa por id

      const mismatchCall = service.registerClientOrder(
        payload({
          rut_normalizado: '123456785',
          rut_raw: '12.345.678-5',
          companyId: 12,
        }) as any,
      );

      await expect(mismatchCall).rejects.toThrow('no calza con el de la empresa');
      // El 400 viaja tal cual (no envuelto como Error plano — JD ronda 2).
      await expect(mismatchCall).rejects.toBeInstanceOf(BadRequestException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('creates a company only when is_company is true', async () => {
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null); // sin empresa previa por rut

      await service.registerClientOrder(
        payload({
          rut_normalizado: '76042014k',
          rut_raw: '76042014k',
          is_company: true,
          company_name: 'Walmart Chile',
        }) as any,
      );

      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        CompanyEntity,
        expect.objectContaining({ rut_normalizado: '76042014k', name: 'Walmart Chile' }),
      );
    });

    it('reactivates an INACTIVE company with the same rut instead of failing on UNIQUE (B4)', async () => {
      const inactive = {
        id: 21,
        rut_normalizado: '76042014k',
        name: 'Walmart (vieja)',
        active: false,
      } as CompanyEntity;
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // step 1
        .mockResolvedValueOnce(null) // step 2
        .mockResolvedValueOnce(null) // empresa ACTIVA por rut: no hay
        .mockResolvedValueOnce(inactive); // empresa inactiva por rut: sí

      await service.registerClientOrder(
        payload({
          rut_normalizado: '76042014k',
          rut_raw: '76042014k',
          is_company: true,
          company_name: 'Walmart Chile',
        }) as any,
      );

      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        CompanyEntity,
        expect.objectContaining({ id: 21, active: true }),
      );
      const clientSave = (queryRunner.manager.save as jest.Mock).mock.calls.find(
        (c) => c[0] === ClientEntity,
      );
      expect(clientSave?.[1].company_id).toBe(21);
    });

    it('keeps company null for junk ruts — never groups', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);

      await service.registerClientOrder(payload({ rut_normalizado: '0', rut_raw: '0' }) as any);

      const clientSave = (queryRunner.manager.save as jest.Mock).mock.calls.find(
        (c) => c[0] === ClientEntity,
      );
      expect(clientSave?.[1].company_id).toBeNull();
      const companyLookups = (queryRunner.manager.findOne as jest.Mock).mock.calls.filter(
        (c) => c[0] === CompanyEntity,
      );
      expect(companyLookups.length).toBe(0);
    });

    it('uses the explicitly selected companyId and copies the rut when missing', async () => {
      const company = { id: 12, rut_normalizado: '96792430k', name: 'Sodimac', active: true } as CompanyEntity;
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // step 2 (sin rut_normalizado se salta el step 1)
        .mockResolvedValueOnce(company); // resolveCompany: empresa por id

      await service.registerClientOrder(
        payload({ rut_normalizado: '', rut_raw: '', companyId: 12 }) as any,
      );

      const clientSave = (queryRunner.manager.save as jest.Mock).mock.calls.find(
        (c) => c[0] === ClientEntity,
      );
      expect(clientSave?.[1].company_id).toBe(12);
      expect(clientSave?.[1].rut_normalizado).toBe('96792430k');
    });
  });
});
