import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ClientEntity } from '../entities/client.entity';
import { CompanyEntity } from '../entities/company.entity';
import * as ExcelJS from 'exceljs';
import { ClientService } from './client.service';

describe('ClientService', () => {
  let service: ClientService;
  let clientRepository: Repository<ClientEntity>;
  let companyRepository: Repository<CompanyEntity>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let dataSource: jest.Mocked<DataSource>;

  const mockCompany: CompanyEntity = {
    id: 1,
    rut_normalizado: '12345678-5',
    name: 'Empresa Test',
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
      company_id: 1,
      company: mockCompany,
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
      company_id: 2,
      company: { ...mockCompany, id: 2, rut_normalizado: '98765432-1' },
    },
  ];

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
          provide: getRepositoryToken(CompanyEntity),
          useValue: {
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
    companyRepository = module.get<Repository<CompanyEntity>>(getRepositoryToken(CompanyEntity));
    dataSource = module.get<DataSource>(DataSource) as jest.Mocked<DataSource>;

    const manager = {
      find: jest.fn().mockResolvedValue([]),
      query: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager,
    } as unknown as jest.Mocked<QueryRunner>;
    (dataSource.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
  });

  describe('getClientsByRut', () => {
    it('should find active clients by rut_raw using ILIKE (with the company relation loaded)', async () => {
      const expectedClients = [mockClients[0]];
      const queryBuilderMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(expectedClients),
      };

      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      const result = await service.getClientsByRut('12345678-5');

      expect(result).toEqual(expectedClients);
      expect(clientRepository.createQueryBuilder).toHaveBeenCalledWith('client');
      expect(queryBuilderMock.leftJoinAndSelect).toHaveBeenCalledWith('client.company', 'company');
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'client.rut_raw ILIKE :rut AND client.active = true',
        { rut: '%12345678-5%' },
      );
    });

    it('should return empty array when no clients match', async () => {
      const queryBuilderMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
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
        leftJoinAndSelect: jest.fn().mockReturnThis(),
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
      leftJoinAndSelect: jest.fn().mockReturnThis(),
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

    it('should filter by company through the company_entity join', async () => {
      const qb = buildQb();
      qb.leftJoin = jest.fn().mockReturnThis();
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(qb as any);

      await service.searchClients('sodimac', 'company');

      expect(qb.leftJoin).toHaveBeenCalledWith('company_entity', 'co', 'co.id = c.company_id');
      expect(qb.where).toHaveBeenCalledWith('co.name ILIKE :term', { term: '%sodimac%' });
    });
  });

  describe('checkDuplicates', () => {
    const buildCandidatesQb = (candidates: any[]): any => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(candidates),
    });

    it('should exclude the explicitly selected clientId from the matches', async () => {
      const qb = buildCandidatesQb([mockClients[0]]);
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.checkDuplicates({
        name: 'Juan Pérez',
        rut: '12345678-5',
        clientId: 1,
      });

      expect(result.count).toBe(0);
      expect(result.matches).toHaveLength(0);
    });

    it('should still match OTHER clients sharing the same data', async () => {
      const otherWithSameRut = { ...mockClients[0], id: 3 };
      const qb = buildCandidatesQb([mockClients[0], otherWithSameRut]);
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.checkDuplicates({
        name: 'Juan Pérez',
        rut: '12345678-5',
        clientId: 1,
      });

      expect(result.count).toBe(1);
      expect(result.matches[0].client.id).toBe(3);
    });

    it('should keep all matches when no clientId is provided', async () => {
      const qb = buildCandidatesQb([mockClients[0]]);
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.checkDuplicates({
        name: 'Juan Pérez',
        rut: '12345678-5',
      });

      expect(result.count).toBe(1);
      expect(result.matches[0].client.id).toBe(1);
    });

    it('should exclude the selected company branches but keep other companies', async () => {
      const sibling = { ...mockClients[0], id: 3 };
      const otherCompany = { ...mockClients[0], id: 4, company_id: 2 };
      const qb = buildCandidatesQb([mockClients[0], sibling, otherCompany]);
      jest.spyOn(clientRepository, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.checkDuplicates({
        name: 'Juan Pérez',
        rut: '12345678-5',
        companyId: 1,
      });

      expect(result.count).toBe(1);
      expect(result.matches[0].client.id).toBe(4);
    });
  });

  describe('buildClientsXlsx', () => {
    const buildXlsQb = (raw: any[]): any => ({
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
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
    const companyClients: any[] = [
      {
        id: 1,
        name: 'Walmart Chile SA',
        rut_raw: '76042014k',
        rut_normalizado: '76042014-K',
        address: 'Matriz Santiago',
        city: 'Santiago',
        active: true,
        company_id: 10,
        company: { id: 10, rut_normalizado: '76042014-K', name: 'Walmart', active: true },
      },
      {
        id: 2,
        name: 'Walmart Viña',
        rut_raw: '76042014k',
        rut_normalizado: '76042014-K',
        address: 'Viña del Mar',
        city: 'Viña del Mar',
        active: true,
        company_id: 10,
        company: { id: 10, rut_normalizado: '76042014-K', name: 'Walmart', active: true },
      },
      {
        id: 3,
        name: 'Walmart Concón',
        rut_raw: '76042014k',
        rut_normalizado: '76042014-K',
        address: 'Concón',
        city: 'Concón',
        active: true,
        company_id: 10,
        company: { id: 10, rut_normalizado: '76042014-K', name: 'Walmart', active: true },
      },
    ];

    it('should return all clients sharing the same company_id', async () => {
      jest.spyOn(clientRepository, 'findOne').mockResolvedValue(companyClients[0]);
      jest.spyOn(clientRepository, 'find').mockResolvedValue(companyClients);

      const result = await service.getClientHierarchy(1);

      expect(result).toEqual(companyClients);
      expect(result).toHaveLength(3);
      expect(clientRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(clientRepository.find).toHaveBeenCalledWith({ where: { company_id: 10 } });
    });

    it('should return only the client when it has no company', async () => {
      const soloClient: ClientEntity = {
        id: 99,
        name: 'Cliente Individual',
        rut_raw: '12345678-5',
        address: 'Calle 123',
        city: 'Santiago',
        active: true,
        company_id: null,
        company: null,
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
    it('links an existing company by meaningful rut (never creates here)', async () => {
      const branchClient: ClientEntity = {
        name: 'Walmart Viña',
        rut_raw: '76042014-K',
        rut_normalizado: '76042014-K',
        address: 'Viña del Mar 789',
        city: 'Viña del Mar',
        active: true,
        company_id: null,
        company: null as any,
      };

      const existingCompany: CompanyEntity = {
        id: 1,
        rut_normalizado: '76042014-K',
        name: 'Walmart Chile',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(existingCompany);
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (_entityClass, client: ClientEntity) => ({ ...client, id: 3 }),
      );

      const result = await service.createUser(branchClient);

      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(CompanyEntity, {
        where: { rut_normalizado: '76042014-K', active: true },
      });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.company_id).toBe(1);
      // Las empresas NO se crean desde acá (solo desde registrar orden).
      expect(queryRunner.manager.save).not.toHaveBeenCalledWith(CompanyEntity, expect.anything());
    });

    it('keeps company null when no company matches — never auto-creates', async () => {
      const newClient: ClientEntity = {
        name: 'Comercial ABC Ltda.',
        rut_raw: '11111111-1',
        rut_normalizado: '11111111-1',
        address: 'Calle Nueva 1',
        city: 'Santiago',
        active: true,
        company_id: null,
        company: null as any,
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (_entityClass, client: ClientEntity) => ({ ...client, id: 10 }),
      );

      const result = await service.createUser(newClient);

      expect(queryRunner.manager.save).not.toHaveBeenCalledWith(CompanyEntity, expect.anything());
      expect(result.company_id).toBeNull();
    });

    it('never links a company for junk ruts', async () => {
      const junkClient: ClientEntity = {
        name: 'Cliente Sin Rut',
        rut_raw: '0',
        rut_normalizado: '0',
        address: 'Calle 1',
        city: 'Santiago',
        active: true,
        company_id: null,
        company: null as any,
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (_entityClass, client: ClientEntity) => ({ ...client, id: 20 }),
      );

      const result = await service.createUser(junkClient);

      expect(queryRunner.manager.findOne).not.toHaveBeenCalledWith(CompanyEntity, expect.anything());
      expect(result.company_id).toBeNull();
    });

    it('acquires the advisory lock on the normalized name and rechecks conflicts inside the transaction', async () => {
      const newClient: ClientEntity = {
        name: 'Juán Pérez',
        rut_raw: '',
        address: '',
        city: '',
        active: true,
        company_id: null,
        company: null as any,
      };

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);
      (queryRunner.manager.save as jest.Mock)
        .mockResolvedValueOnce({ id: 1, rut_normalizado: null, name: 'Juán Pérez', active: true })
        .mockImplementationOnce(async (_entityClass, client: ClientEntity) => ({
          ...client,
          id: 30,
        }));

      await service.createUser(newClient);

      // "Juán Pérez" normalizes to "juan perez" (lowercase, no accents)
      expect(queryRunner.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('pg_advisory_xact_lock'),
        ['juan perez'],
      );
      expect(queryRunner.manager.find).toHaveBeenCalledWith(
        ClientEntity,
        expect.objectContaining({ where: { active: true } }),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('409s and rolls back (no client, no company) when the in-tx recheck finds a duplicate', async () => {
      const newClient: ClientEntity = {
        name: 'Juan Perez',
        rut_raw: '',
        address: '',
        city: '',
        active: true,
        company_id: null,
        company: null as any,
      };

      (queryRunner.manager.find as jest.Mock).mockResolvedValue([
        { id: 7, name: 'Juán Pérez' },
      ]);

      await expect(service.createUser(newClient)).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
      });

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });
  });

  describe('updateUserById — rename guard (T2, MRS)', () => {
    const baseClient: ClientEntity = {
      id: 1,
      name: 'María González',
      rut_raw: '15234567-6',
      rut_normalizado: '15234567-6',
      address: 'Calle Los Cerezos 45',
      city: 'Las Condes',
      active: true,
      company_id: null,
      company: null as any,
    };

    it('should reject 409 and roll back when renaming onto an existing normalized name', async () => {
      jest.spyOn(clientRepository, 'findOne').mockResolvedValue({ ...baseClient });
      (queryRunner.manager.find as jest.Mock).mockResolvedValue([
        { id: 9, name: 'Maria Gonzalez', active: true },
      ]);

      await expect(
        service.updateUserById(1, { ...baseClient, name: 'maria  GONZALEZ' }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('should save inside the transaction and commit (write covered by the lock)', async () => {
      jest.spyOn(clientRepository, 'findOne').mockResolvedValue({ ...baseClient });
      (queryRunner.manager.find as jest.Mock).mockResolvedValue([]);
      (queryRunner.manager.save as jest.Mock).mockImplementation(
        async (_entity: any, client: ClientEntity) => client,
      );

      const result = await service.updateUserById(1, { ...baseClient, city: 'Viña del Mar' });

      expect(result.city).toBe('Viña del Mar');
      expect(queryRunner.manager.save).toHaveBeenCalledWith(ClientEntity, expect.anything());
      expect(clientRepository.save).not.toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });
  });

  describe('getGroupClients', () => {
    it('should return all clients for a given company_id', async () => {
      const mockCompanyClients: ClientEntity[] = [
        { id: 1, name: 'A', rut_raw: '1', address: '', city: '', active: true, company_id: 1, company: mockCompany },
        { id: 2, name: 'B', rut_raw: '2', address: '', city: '', active: true, company_id: 2, company: { ...mockCompany, id: 2 } },
      ];
      jest.spyOn(clientRepository, 'find').mockResolvedValue(mockCompanyClients);

      const result = await service.getGroupClients(1);

      expect(result).toEqual(mockCompanyClients);
      expect(result).toHaveLength(2);
      expect(clientRepository.find).toHaveBeenCalledWith({ where: { company_id: 1 } });
    });

    it('should return empty array when group has no clients', async () => {
      jest.spyOn(clientRepository, 'find').mockResolvedValue([]);

      const result = await service.getGroupClients(999);

      expect(result).toEqual([]);
    });
  });
});
