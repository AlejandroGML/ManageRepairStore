import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { ClientEntity } from '../entities/client.entity';
import { ClientGroupEntity } from '../entities/client-group.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderStatus } from './order-status.enum';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let queryRunner: jest.Mocked<QueryRunner>;
  let dataSource: jest.Mocked<DataSource>;

  const mockOrder = (overrides: Partial<OrderEntity> = {}): OrderEntity => ({
    description: 'fix leak',
    status: OrderStatus.PENDIENTE,
    total: 0,
    code: 'ORD-1',
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
    name: 'Comercial Demo SpA',
    rut_raw: '12345678-5',
    rut_normalizado: '12345678-5',
    address: 'Providencia 123',
    city: 'Santiago',
    active: true,
    group_id: 1,
    group: null as any,
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
          provide: getRepositoryToken(ClientGroupEntity),
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

    queryRunner = mockQueryRunner();
    (dataSource.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
  });

  describe('registerClientOrder — matching', () => {
    const existingClient: ClientEntity = {
      id: 10,
      name: 'Comercial Demo SpA',
      rut_raw: '12.345.678-5',
      rut_normalizado: '12345678-5',
      address: 'Providencia 123',
      city: 'Santiago',
      active: true,
      company_name: 'Principal',
      group_id: 1,
      group: null as any,
    };

    it('should match by normalized RUT + name (ilower, trimmed) when rut_normalizado is available', async () => {
      const incoming: ClientEntity = {
        ...makeClient({ rut_normalizado: '12345678-5', rut_raw: '12345678-5', name: '  Comercial Demo SpA  ' }),
      };

      const matchedClient = { ...existingClient, rut_raw: '12345678-5' };
      const normalizedWhere = {
        name: 'comercial demo spa',
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
      expect(result.name).toBe('Comercial Demo SpA');
    });

    it('should fallback to rut_raw + name when no normalized RUT match found', async () => {
      const incoming: ClientEntity = {
        ...makeClient({ rut_normalizado: '12345678-5', rut_raw: '12345678-5', name: 'Comercial Demo SpA' }),
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
        ...makeClient({ id: 42, rut_normalizado: '12345678-5', rut_raw: '99999999-9', name: 'Comercial Demo SpA' }),
      };

      const idMatch: ClientEntity = {
        ...existingClient, id: 42, name: 'Comercial Demo SpA', rut_raw: '99999999-9',
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
        ...makeClient({ rut_normalizado: '76042014-K', rut_raw: '76042014-K', name: 'Retail Demo Norte' }),
      };

      const branchNorte: ClientEntity = {
        id: 50,
        name: 'Retail Demo Norte',
        rut_raw: '76042014-K',
        rut_normalizado: '76042014-K',
        address: 'Santiago',
        city: 'Santiago',
        active: true,
        company_name: 'Sucursal Norte',
        group_id: 5,
        group: null as any,
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(branchNorte);

      const result = await service.registerClientOrder(incoming);

      // Should match by normalized RUT + name, returning the correct branch
      expect(result.id).toBe(50);
      expect(result.company_name).toBe('Sucursal Norte');
      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(ClientEntity, {
        where: {
          name: 'retail demo norte',
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
  });

  describe('registerClientOrder — company_name update', () => {
    const existingClient: ClientEntity = {
      id: 20,
      name: 'Comercial Demo SpA',
      rut_raw: '12345678-5',
      rut_normalizado: '12345678-5',
      address: 'Providencia 123',
      city: 'Santiago',
      active: true,
      company_name: 'Old Branch',
      group_id: 1,
      group: null as any,
    };

    it('should update company_name when frontend sends a different one', async () => {
      const incoming: ClientEntity = {
        ...makeClient({
          rut_normalizado: '12345678-5',
          rut_raw: '12345678-5',
          name: 'Comercial Demo SpA',
          company_name: 'New Branch',
        }),
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(existingClient);

      await service.registerClientOrder(incoming);

      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        ClientEntity,
        existingClient.id,
        { company_name: 'New Branch' },
      );
    });

    it('should NOT update company_name when it is the same', async () => {
      const incoming: ClientEntity = {
        ...makeClient({
          rut_normalizado: '12345678-5',
          rut_raw: '12345678-5',
          name: 'Comercial Demo SpA',
          company_name: 'Old Branch',
        }),
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(existingClient);

      await service.registerClientOrder(incoming);

      expect(queryRunner.manager.update).not.toHaveBeenCalled();
    });

    it('should NOT update company_name when frontend does not send it', async () => {
      const incoming: ClientEntity = {
        ...makeClient({
          rut_normalizado: '12345678-5',
          rut_raw: '12345678-5',
          name: 'Comercial Demo SpA',
          company_name: undefined,
        }),
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(existingClient);

      await service.registerClientOrder(incoming);

      expect(queryRunner.manager.update).not.toHaveBeenCalled();
    });
  });
});
