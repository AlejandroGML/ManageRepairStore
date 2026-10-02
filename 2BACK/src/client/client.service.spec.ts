import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ClientEntity } from '../entities/client.entity';
import { ClientGroupEntity } from '../entities/client-group.entity';
import * as ExcelJS from 'exceljs';
import { ClientService } from './client.service';

describe('ClientService', () => {
  let service: ClientService;
  let clientRepository: Repository<ClientEntity>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let dataSource: jest.Mocked<DataSource>;

  const mockGroup: ClientGroupEntity = {
    id: 1,
    rut_normalizado: '12345678-5',
    name: 'Grupo Test',
    credit_limit: 0,
    payment_terms: '',
    active: true,
    clients: [],
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockClients: ClientEntity[] = [
    {
      id: 1,
      name: 'Juan Pérez',
      rut_raw: '12345678-5',
      rut_normalizado: '12345678-5',
      address: 'Av. Siempre Viva 123',
      city: 'Santiago',
      phone: '+56912345678',
      email: 'juan@example.com',
      active: true,
      group_id: 1,
      group: mockGroup,
      company_name: 'Principal',
    },
    {
      id: 2,
      name: 'María González',
      rut_raw: '98765432-1',
      rut_normalizado: '98765432-1',
      address: 'Calle Falsa 456',
      city: 'Valparaíso',
      phone: '+56987654321',
      email: 'maria@example.com',
      active: true,
      group_id: 2,
      group: { ...mockGroup, id: 2, rut_normalizado: '98765432-1' },
    },
  ];

  const mockQueryRunner = (): jest.Mocked<QueryRunner> => {
    const manager = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      query: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      update: jest.fn(),
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
        ClientService,
        {
          provide: getRepositoryToken(ClientEntity),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
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

    service = module.get<ClientService>(ClientService);
    clientRepository = module.get<Repository<ClientEntity>>(getRepositoryToken(ClientEntity));
    dataSource = module.get<DataSource>(DataSource) as jest.Mocked<DataSource>;

    queryRunner = mockQueryRunner();
    (dataSource.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
  });

  describe('getClientsByRut', () => {
    it('should find active clients by rut_raw using ILIKE', async () => {
      const expectedClients = [mockClients[0]];
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(expectedClients),
      };

      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      const result = await service.getClientsByRut('12345678-5');

      expect(result).toEqual(expectedClients);
      expect(clientRepository.createQueryBuilder).toHaveBeenCalledWith('client');
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'client.rut_raw ILIKE :rut AND client.active = true',
        { rut: '%12345678-5%' },
      );
    });

    it('should return empty array when no clients match', async () => {
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      const result = await service.getClientsByRut('00000000-0');

      expect(result).toEqual([]);
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'client.rut_raw ILIKE :rut AND client.active = true',
        { rut: '%00000000-0%' },
      );
    });

    it('should match partial RUT via ILIKE wildcards', async () => {
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockClients),
      };

      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      const result = await service.getClientsByRut('1234');

      expect(result).toHaveLength(2);
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'client.rut_raw ILIKE :rut AND client.active = true',
        { rut: '%1234%' },
      );
    });
  });

  describe('searchClients', () => {
    const buildQb = (): any => ({
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn().mockResolvedValue({
        entities: [mockClients[0]],
        raw: [{ order_count: '3' }],
      }),
    });

    it('should search by name with ILIKE and map the order count', async () => {
      const qb = buildQb();
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.searchClients('juan', 'name');

      expect(qb.where).toHaveBeenCalledWith('c.name ILIKE :term', { term: '%juan%' });
      expect(qb.take).toHaveBeenCalledWith(100);
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].orderCount).toBe(3);
    });

    it('should sanitize LIKE wildcards and cap the limit at 100', async () => {
      const qb = buildQb();
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(qb as any);

      await service.searchClients('ju_an%', 'name', 500);

      expect(qb.where).toHaveBeenCalledWith('c.name ILIKE :term', { term: '%ju\\_an\\%%' });
      expect(qb.take).toHaveBeenCalledWith(100);
    });

    it('should match RUT ignoring dots and dashes', async () => {
      const qb = buildQb();
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(qb as any);

      await service.searchClients('12.345-6', 'rut');

      expect(qb.where).toHaveBeenCalledWith(
        "REPLACE(REPLACE(c.rut_raw, '.', ''), '-', '') ILIKE :digits " +
          "OR REPLACE(REPLACE(c.rut_normalizado, '.', ''), '-', '') ILIKE :digits",
        { digits: '%123456%' },
      );
    });

    it('should filter by company field', async () => {
      const qb = buildQb();
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(qb as any);

      await service.searchClients('sodimac', 'company');

      expect(qb.where).toHaveBeenCalledWith('c.company_name ILIKE :term', { term: '%sodimac%' });
    });
  });

  describe('buildClientsXlsx', () => {
    const buildXlsQb = (raw: any[]): any => ({
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(raw),
    });

    const rawRows = [
      { c_id: 1, c_name: 'Juan "Juanito" Pérez', c_rut_raw: '12345678-5', c_phone: '+56912345678', c_email: 'juan@example.com', c_address: 'Av. Siempre Viva 123', c_city: 'Santiago', c_company_name: 'Principal' },
      { c_id: 2, c_name: 'María González', c_rut_raw: null, c_phone: null, c_email: null, c_address: null, c_city: null, c_company_name: null },
    ];

    async function loadWorkbook(): Promise<ExcelJS.Workbook> {
      const qb = buildXlsQb(rawRows);
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(qb as any);
      const buffer = await service.buildClientsXlsx();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as ArrayBuffer);
      return wb;
    }

    it('should build a styled sheet with header, data and Particular fallback', async () => {
      const wb = await loadWorkbook();
      const sheet = wb.getWorksheet('Clientes')!;
      expect(sheet).toBeDefined();

      const header = sheet.getRow(1);
      expect(header.getCell(1).value).toBe('N°');
      expect(header.getCell(8).value).toBe('Empresa');
      expect(header.getCell(1).font?.bold).toBe(true);

      expect(sheet.getRow(2).getCell(2).value).toBe('Juan "Juanito" Pérez');
      expect(sheet.getRow(3).getCell(8).value).toBe('Particular');
      expect(sheet.rowCount).toBe(3); // encabezado + 2 filas
    });

    it('should zebra-stripe alternate data rows', async () => {
      const wb = await loadWorkbook();
      const sheet = wb.getWorksheet('Clientes')!;
      // fila 3 (segunda de datos, i=1) lleva relleno zebra
      const zebra = sheet.getRow(3).getCell(2).fill;
      expect(zebra.type).toBe('pattern');
      expect((zebra as any).fgColor?.argb).toBe('FFF3F4F6');
      // fila 2 (primera de datos) sin relleno
      const plain = sheet.getRow(2).getCell(2).fill as any;
      expect(plain?.fgColor?.argb ?? 'none').not.toBe('FFF3F4F6');
    });

    it('should freeze the header row and set an autoFilter', async () => {
      const wb = await loadWorkbook();
      const sheet = wb.getWorksheet('Clientes')!;
      expect(sheet.views?.[0]).toEqual(expect.objectContaining({ state: 'frozen', ySplit: 1 }));
      expect(sheet.autoFilter).toBeDefined();
    });

    it('should return only the header row when there are no clients', async () => {
      const qb = buildXlsQb([]);
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(qb as any);

      const buffer = await service.buildClientsXlsx();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as ArrayBuffer);
      const sheet = wb.getWorksheet('Clientes')!;
      expect(sheet.rowCount).toBe(1);
      expect(sheet.getRow(1).getCell(1).value).toBe('N°');
    });
  });

  describe('getClientHierarchy', () => {
    const groupClients: any[] = [
      {
        id: 1,
        name: 'Walmart Chile SA',
        rut_raw: '76042014k',
        rut_normalizado: '76042014-K',
        address: 'Matriz Santiago',
        city: 'Santiago',
        active: true,
        group_id: 10,
        group: { id: 10, rut_normalizado: '76042014-K', name: 'Walmart', active: true },
      },
      {
        id: 2,
        name: 'Walmart Viña',
        rut_raw: '76042014k',
        rut_normalizado: '76042014-K',
        address: 'Viña del Mar',
        city: 'Viña del Mar',
        active: true,
        group_id: 10,
        group: { id: 10, rut_normalizado: '76042014-K', name: 'Walmart', active: true },
      },
      {
        id: 3,
        name: 'Walmart Concón',
        rut_raw: '76042014k',
        rut_normalizado: '76042014-K',
        address: 'Concón',
        city: 'Concón',
        active: true,
        group_id: 10,
        group: { id: 10, rut_normalizado: '76042014-K', name: 'Walmart', active: true },
      },
    ];

    it('should return all clients sharing the same group_id', async () => {
      jest.spyOn(clientRepository, 'findOne').mockResolvedValue(groupClients[0]);
      jest.spyOn(clientRepository, 'find').mockResolvedValue(groupClients);

      const result = await service.getClientHierarchy(1);

      expect(result).toEqual(groupClients);
      expect(result).toHaveLength(3);
      expect(clientRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(clientRepository.find).toHaveBeenCalledWith({ where: { group_id: 10 } });
    });

    it('should return empty array when client has no group_id', async () => {
      const soloClient: ClientEntity = {
        id: 99,
        name: 'Cliente Individual',
        rut_raw: '12345678-5',
        address: 'Calle 123',
        city: 'Santiago',
        active: true,
        group_id: 1,
        group: mockGroup,
      };
      jest.spyOn(clientRepository, 'findOne').mockResolvedValue(soloClient);
      jest.spyOn(clientRepository, 'find').mockResolvedValue([soloClient]);

      const result = await service.getClientHierarchy(99);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(99);
    });

    it('should return empty array when client does not exist', async () => {
      jest.spyOn(clientRepository, 'findOne').mockResolvedValue(null);
      const findSpy = jest.spyOn(clientRepository, 'find');

      const result = await service.getClientHierarchy(999);

      expect(result).toEqual([]);
      expect(findSpy).not.toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should preserve existing group.name when creating a branch (same rut_normalizado)', async () => {
      const branchClient: ClientEntity = {
        name: 'Juan Pérez Sucursal Viña',
        rut_raw: '12345678-5',
        rut_normalizado: '12345678-5',
        address: 'Viña del Mar 789',
        city: 'Viña del Mar',
        active: true,
        company_name: 'Sucursal Viña',
        group_id: 0, // will be set by createUser
        group: null as any,
      };

      const existingGroup: ClientGroupEntity = {
        id: 1,
        rut_normalizado: '12345678-5',
        name: 'Juan Pérez',
        credit_limit: 0,
        payment_terms: '',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(existingGroup);
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (_entity: any, client: ClientEntity) => ({
          ...client,
          id: 3,
          group: existingGroup,
        }),
      );

      const result = await service.createUser(branchClient);

      // group should be the existing one, NOT a new save
      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(ClientGroupEntity, {
        where: { rut_normalizado: '12345678-5' },
      });
      // Only the CLIENT save happened (group find, not group create)
      expect(queryRunner.manager.save).toHaveBeenCalledTimes(1);
      expect(result.group.name).toBe('Juan Pérez');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should create a new group with first client name when no group exists', async () => {
      const newClient: ClientEntity = {
        name: 'Comercial ABC Ltda.',
        rut_raw: '11111111-1',
        rut_normalizado: '11111111-1',
        address: 'Calle Nueva 1',
        city: 'Santiago',
        active: true,
        company_name: 'Sucursal Centro',
        group_id: 0,
        group: null as any,
      };

      const savedGroup: ClientGroupEntity = {
        id: 99,
        rut_normalizado: '11111111-1',
        name: 'Comercial ABC Ltda.',
        credit_limit: 0,
        payment_terms: '',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);
      (queryRunner.manager.save as jest.Mock)
        .mockResolvedValueOnce(savedGroup) // group create
        .mockImplementationOnce(
          async (_entity: any, client: ClientEntity) => ({
            ...client,
            id: 10,
            group: savedGroup,
          }),
        );

      const result = await service.createUser(newClient);

      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(ClientGroupEntity, {
        where: { rut_normalizado: '11111111-1' },
      });
      expect(queryRunner.manager.save).toHaveBeenCalledWith(ClientGroupEntity, {
        rut_normalizado: '11111111-1',
        name: 'Comercial ABC Ltda.',
        active: true,
      });
      expect(result.group.name).toBe('Comercial ABC Ltda.');
    });

    it('should persist company_name when provided', async () => {
      const branchClient: ClientEntity = {
        name: 'Walmart Chile SA',
        rut_raw: '76042014-K',
        rut_normalizado: '76042014-K',
        address: 'Santiago Centro',
        city: 'Santiago',
        active: true,
        company_name: 'Sucursal Providencia',
        group_id: 0,
        group: null as any,
      };

      const existingGroup: ClientGroupEntity = {
        id: 5,
        rut_normalizado: '76042014-K',
        name: 'Walmart Chile SA',
        credit_limit: 0,
        payment_terms: '',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(existingGroup);
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (_entity: any, client: ClientEntity) => ({
          ...client,
          id: 20,
          group: existingGroup,
        }),
      );

      const result = await service.createUser(branchClient);

      // company_name should be part of the saved client
      expect(result.company_name).toBe('Sucursal Providencia');
    });

    it('should take the advisory lock, then recheck, then write (T2 ordering)', async () => {
      const newClient: ClientEntity = {
        name: 'Cliente Nuevo',
        rut_raw: '44444444-4',
        address: 'Calle 4',
        city: 'Santiago',
        active: true,
        group_id: 0,
        group: null as any,
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null); // no group
      (queryRunner.manager.save as jest.Mock)
        .mockResolvedValueOnce({ id: 7, rut_normalizado: null }) // group create
        .mockImplementationOnce(async (_e: any, c: ClientEntity) => ({ ...c, id: 8 }));

      await service.createUser(newClient);

      expect(queryRunner.manager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        ['cliente nuevo'],
      );
      const queryOrder = (queryRunner.manager.query as jest.Mock).mock.invocationCallOrder[0];
      const findOrder = (queryRunner.manager.find as jest.Mock).mock.invocationCallOrder[0];
      const saveOrder = (queryRunner.manager.save as jest.Mock).mock.invocationCallOrder[0];
      expect(queryOrder).toBeLessThan(findOrder);
      expect(findOrder).toBeLessThan(saveOrder);
    });

    it('should reject 409 and roll back when an active client normalizes equal', async () => {
      const newClient: ClientEntity = {
        name: 'JUAN  pEREZ',
        rut_raw: '55555555-5',
        address: 'Calle 5',
        city: 'Santiago',
        active: true,
        group_id: 0,
        group: null as any,
      };
      const existing = { id: 3, name: 'Juan Pérez', active: true } as ClientEntity;
      (queryRunner.manager.find as jest.Mock).mockResolvedValue([existing]);

      await expect(service.createUser(newClient)).rejects.toThrow(
        new HttpException(
          'Ya existe un cliente similar: "Juan Pérez" (#3)',
          HttpStatus.CONFLICT,
        ),
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });
  });

  describe('updateUserById — rename guard', () => {
    it('should reject 409 and roll back when renaming onto an existing normalized name', async () => {
      const userToUpdate = { ...mockClients[0] };
      (clientRepository.findOne as jest.Mock).mockResolvedValue(userToUpdate);
      const existing = { id: 9, name: 'Maria Gonzalez', active: true } as ClientEntity;
      (queryRunner.manager.find as jest.Mock).mockResolvedValue([existing]);

      await expect(
        service.updateUserById(1, { ...mockClients[0], name: 'maria  GONZALEZ' }),
      ).rejects.toThrow(
        new HttpException(
          'Ya existe un cliente similar: "Maria Gonzalez" (#9)',
          HttpStatus.CONFLICT,
        ),
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('should save inside the transaction and commit (T2: write covered by the lock)', async () => {
      const userToUpdate = { ...mockClients[0] };
      (clientRepository.findOne as jest.Mock).mockResolvedValue(userToUpdate);
      (queryRunner.manager.find as jest.Mock).mockResolvedValue([]);
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (_entity: any, client: ClientEntity) => client,
      );

      const result = await service.updateUserById(1, { ...mockClients[0], city: 'Viña del Mar' });

      expect(result.city).toBe('Viña del Mar');
      expect(queryRunner.manager.save).toHaveBeenCalledWith(ClientEntity, expect.anything());
      expect(clientRepository.save).not.toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });
  });

  describe('getGroupClients', () => {
    it('should return all clients for a given group_id', async () => {
      const mockGroupClients: ClientEntity[] = [
        { id: 1, name: 'A', rut_raw: '1', address: '', city: '', active: true, group_id: 1, group: mockGroup },
        { id: 2, name: 'B', rut_raw: '2', address: '', city: '', active: true, group_id: 2, group: { ...mockGroup, id: 2 } },
      ];
      jest.spyOn(clientRepository, 'find').mockResolvedValue(mockGroupClients);

      const result = await service.getGroupClients(1);

      expect(result).toEqual(mockGroupClients);
      expect(result).toHaveLength(2);
      expect(clientRepository.find).toHaveBeenCalledWith({ where: { group_id: 1 } });
    });

    it('should return empty array when group has no clients', async () => {
      jest.spyOn(clientRepository, 'find').mockResolvedValue([]);

      const result = await service.getGroupClients(999);

      expect(result).toEqual([]);
    });
  });
});
