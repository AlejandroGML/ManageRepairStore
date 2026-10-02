import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CompanyEntity } from '../entities/company.entity';
import { ClientEntity } from '../entities/client.entity';
import { CompanyService } from './company.service';

describe('CompanyService', () => {
  let service: CompanyService;
  let companyRepository: jest.Mocked<Repository<CompanyEntity>>;
  let clientRepository: jest.Mocked<Repository<ClientEntity>>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let dataSource: jest.Mocked<DataSource>;

  const makeCompany = (id: number, name: string, rut = `760000${id}-k`): CompanyEntity => ({
    id,
    name,
    rut_normalizado: rut,
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: getRepositoryToken(CompanyEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClientEntity),
          useValue: { find: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { createQueryRunner: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    companyRepository = module.get<Repository<CompanyEntity>>(getRepositoryToken(CompanyEntity)) as jest.Mocked<Repository<CompanyEntity>>;
    clientRepository = module.get<Repository<ClientEntity>>(getRepositoryToken(ClientEntity)) as jest.Mocked<Repository<ClientEntity>>;
    dataSource = module.get<DataSource>(DataSource) as jest.Mocked<DataSource>;

    const manager = {
      query: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };
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

  describe('list', () => {
    const buildQb = (): any => ({
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(12),
      getRawAndEntities: jest.fn().mockResolvedValue({
        entities: [makeCompany(1, 'Sodimac'), makeCompany(2, 'Lider')],
        raw: [{ branch_count: '8' }, { branch_count: '3' }],
      }),
    });

    it('paginates with default limit 10 and returns branch counts', async () => {
      const qb = buildQb();
      (companyRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.list(2, 10);

      expect(result.total).toBe(12);
      expect(result.page).toBe(2);
      expect(qb.offset).toHaveBeenCalledWith(10);
      expect(qb.limit).toHaveBeenCalledWith(10);
      expect(result.items).toEqual([
        expect.objectContaining({ name: 'Sodimac', branchCount: 8 }),
        expect.objectContaining({ name: 'Lider', branchCount: 3 }),
      ]);
    });

    it('filters by name or rut when q is provided', async () => {
      const qb = buildQb();
      (companyRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await service.list(1, 10, 'sodimac');

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(co.name ILIKE :term OR co.rut_normalizado ILIKE :term)',
        { term: '%sodimac%' },
      );
    });

    it('caps the limit at 100 and floors the page at 1', async () => {
      const qb = buildQb();
      (companyRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.list(0, 500);

      expect(result.page).toBe(1);
      expect(qb.limit).toHaveBeenCalledWith(100);
      expect(qb.offset).toHaveBeenCalledWith(0);
    });
  });

  describe('getClients', () => {
    it('returns active branches ordered by id', async () => {
      const branches = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] as ClientEntity[];
      (clientRepository.find as jest.Mock).mockResolvedValue(branches);

      const result = await service.getClients(10);

      expect(clientRepository.find).toHaveBeenCalledWith({
        where: { company_id: 10, active: true },
        order: { id: 'ASC' },
      });
      expect(result).toBe(branches);
    });

    it('rejects invalid ids', async () => {
      await expect(service.getClients(0)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('rename', () => {
    it('renames under a transaction with the advisory lock (no clash)', async () => {
      const company = makeCompany(1, 'Waslmart');
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(company);
      (queryRunner.manager.find as jest.Mock).mockResolvedValue([company, makeCompany(2, 'Sodimac')]);
      (queryRunner.manager.save as jest.Mock).mockImplementation(async (_e: any, c: any) => c);

      const result = await service.rename(1, '  Walmart Chile  ');

      expect(queryRunner.manager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        ['walmart chile'],
      );
      expect(result.name).toBe('Walmart Chile');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('409s on a normalized duplicate name and rolls back', async () => {
      const company = makeCompany(1, 'Waslmart');
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(company);
      (queryRunner.manager.find as jest.Mock).mockResolvedValue([company, makeCompany(2, 'Walmart Chile')]);

      await expect(service.rename(1, 'walmart chile')).rejects.toBeInstanceOf(ConflictException);
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('rejects empty names, invalid ids and unknown companies', async () => {
      await expect(service.rename(1, '   ')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.rename(0, 'X')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.rename(NaN, 'X')).rejects.toBeInstanceOf(BadRequestException);

      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.rename(9, 'X')).rejects.toBeInstanceOf(NotFoundException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
