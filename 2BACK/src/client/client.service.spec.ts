import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientEntity } from '../entities/client.entity';
import { ClientGroupEntity } from '../entities/client-group.entity';
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
            find: jest.fn(),
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

  describe('getClientHierarchy', () => {
    const groupClients: any[] = [
      {
        id: 1,
        name: 'Retail Demo Chile SA',
        rut_raw: '76042014k',
        rut_normalizado: '76042014-K',
        address: 'Matriz Santiago',
        city: 'Santiago',
        active: true,
        group_id: 10,
        group: { id: 10, rut_normalizado: '76042014-K', name: 'Retail Demo', active: true },
      },
      {
        id: 2,
        name: 'Retail Demo Norte',
        rut_raw: '76042014k',
        rut_normalizado: '76042014-K',
        address: 'Santiago',
        city: 'Santiago',
        active: true,
        group_id: 10,
        group: { id: 10, rut_normalizado: '76042014-K', name: 'Retail Demo', active: true },
      },
      {
        id: 3,
        name: 'Retail Demo Sur',
        rut_raw: '76042014k',
        rut_normalizado: '76042014-K',
        address: 'Valparaíso',
        city: 'Valparaíso',
        active: true,
        group_id: 10,
        group: { id: 10, rut_normalizado: '76042014-K', name: 'Retail Demo', active: true },
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
        name: 'Juan Pérez Sucursal Norte',
        rut_raw: '12345678-5',
        rut_normalizado: '12345678-5',
        address: 'Santiago 789',
        city: 'Santiago',
        active: true,
        company_name: 'Sucursal Norte',
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
        name: 'Retail Demo Chile SA',
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
        name: 'Retail Demo Chile SA',
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
