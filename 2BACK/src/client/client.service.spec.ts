import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientEntity } from '../entities/client.entity';
import { ClientGroupEntity } from '../entities/client-group.entity';
import * as ExcelJS from 'exceljs';
import { ClientService } from './client.service';

describe('ClientService', () => {
  let service: ClientService;
  let clientRepository: Repository<ClientEntity>;
  let groupRepository: Repository<ClientGroupEntity>;

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
          provide: getRepositoryToken(ClientGroupEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ClientService>(ClientService);
    clientRepository = module.get<Repository<ClientEntity>>(getRepositoryToken(ClientEntity));
    groupRepository = module.get<Repository<ClientGroupEntity>>(getRepositoryToken(ClientGroupEntity));
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

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(existingGroup);
      jest.spyOn(clientRepository, 'save').mockResolvedValue({
        ...branchClient,
        id: 3,
        group: existingGroup,
      } as ClientEntity);

      const result = await service.createUser(branchClient);

      // group should be the existing one, NOT a new save
      expect(groupRepository.findOne).toHaveBeenCalledWith({
        where: { rut_normalizado: '12345678-5' },
      });
      expect(groupRepository.save).not.toHaveBeenCalled();
      expect(result.group.name).toBe('Juan Pérez');
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

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(groupRepository, 'save').mockResolvedValue(savedGroup);
      jest.spyOn(clientRepository, 'save').mockResolvedValue({
        ...newClient,
        id: 10,
        group: savedGroup,
      } as ClientEntity);

      const result = await service.createUser(newClient);

      expect(groupRepository.findOne).toHaveBeenCalledWith({
        where: { rut_normalizado: '11111111-1' },
      });
      expect(groupRepository.save).toHaveBeenCalledWith({
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

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(existingGroup);
      jest.spyOn(clientRepository, 'save').mockImplementation(async (client: any) => ({
        ...client,
        id: 20,
        group: existingGroup,
      } as ClientEntity));

      const result = await service.createUser(branchClient);

      // company_name should be part of the saved client
      expect(result.company_name).toBe('Sucursal Providencia');
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
