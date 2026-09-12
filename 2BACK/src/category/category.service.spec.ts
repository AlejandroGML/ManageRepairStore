import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoryEntity } from '../entities/category.entity';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let repo: {
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  const qb = () => {
    const builder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
    };
    repo.createQueryBuilder.mockReturnValue(builder);
    return builder;
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => ({ id: 99, productCount: 0, ...data })),
      save: jest.fn((c) => Promise.resolve(c)),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: getRepositoryToken(CategoryEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  it('lists categories ordered by name with product counts', async () => {
    repo.find.mockResolvedValue([
      { id: 1, name: 'Filtros', products: [{ id: 10 }, { id: 11 }, { id: 12 }] },
      { id: 2, name: 'Lubricantes', products: [] },
    ]);

    const result = await service.findAll();

    expect(result).toEqual([
      { id: 1, name: 'Filtros', productCount: 3 },
      { id: 2, name: 'Lubricantes', productCount: 0 },
    ]);
    expect(repo.find).toHaveBeenCalledWith({
      relations: { products: true },
      order: { name: 'ASC' },
    });
  });

  it('creates a category with trimmed name', async () => {
    const builder = qb(); // sin duplicados

    const created = await service.create('  Filtros  ');

    expect(created.name).toBe('Filtros');
    expect(repo.create).toHaveBeenCalledWith({ name: 'Filtros' });
    expect(builder.getOne).toHaveBeenCalled();
  });

  it('rejects duplicate names case-insensitively', async () => {
    qb().getOne.mockResolvedValue({ id: 1, name: 'filtros' });

    await expect(service.create('FILTROS')).rejects.toThrow(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects empty names', async () => {
    await expect(service.create('   ')).rejects.toThrow();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('renames a category keeping the same name without duplicate check', async () => {
    repo.findOne.mockResolvedValue({ id: 1, name: 'Filtros' });

    const updated = await service.update(1, '  Filtros ');

    expect(updated.name).toBe('Filtros');
    // El builder de duplicados no debió llamarse (mismo nombre normalizado)
    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('renames a category checking the new name', async () => {
    repo.findOne.mockResolvedValue({ id: 1, name: 'Filtros' });
    qb(); // sin duplicados con el nuevo nombre

    const updated = await service.update(1, 'Repuestos');

    expect(updated.name).toBe('Repuestos');
  });

  it('throws 404 when renaming a missing category', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.update(7, 'X')).rejects.toThrow(NotFoundException);
  });

  it('deletes an empty category', async () => {
    repo.findOne.mockResolvedValue({ id: 1, name: 'Filtros', products: [] });

    await service.remove(1);

    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: { products: true } });
    expect(repo.remove).toHaveBeenCalledWith({ id: 1, name: 'Filtros', products: [] });
  });

  it('blocks deleting a category that still has products (real count)', async () => {
    repo.findOne.mockResolvedValue({
      id: 1,
      name: 'Filtros',
      products: [{ id: 10 }, { id: 11 }, { id: 12 }, { id: 13 }],
    });

    await expect(service.remove(1)).rejects.toThrow(ConflictException);
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('throws 404 when deleting a missing category', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.remove(9)).rejects.toThrow(NotFoundException);
  });
});
