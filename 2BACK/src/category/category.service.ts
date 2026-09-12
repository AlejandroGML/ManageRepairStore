import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../entities/category.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
  ) {}

  /**
   * Todas las categorías (A-Z) con el conteo de productos asociados.
   * TypeORM 1.0 eliminó loadRelationCountAndMap: se resuelve cargando la
   * relación (catálogo de categorías es pequeño) y mapeando el largo.
   */
  async findAll(): Promise<Array<Omit<CategoryEntity, 'products'> & { productCount: number }>> {
    const categories = await this.categoryRepo.find({
      relations: { products: true },
      order: { name: 'ASC' },
    });
    return categories.map(({ products, ...category }) => ({
      ...category,
      productCount: products?.length ?? 0,
    }));
  }

  async create(name: string): Promise<CategoryEntity> {
    const trimmed = this.normalizeName(name);
    await this.assertNameAvailable(trimmed);
    const category = this.categoryRepo.create({ name: trimmed });
    return this.categoryRepo.save(category);
  }

  async update(id: number, name: string): Promise<CategoryEntity> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    const trimmed = this.normalizeName(name);
    if (trimmed.toLowerCase() !== category.name.toLowerCase()) {
      await this.assertNameAvailable(trimmed);
    }
    category.name = trimmed;
    return this.categoryRepo.save(category);
  }

  /**
   * Borra una categoría vacía. Si tiene productos, se bloquea: reasignar o
   * eliminar esos productos es una decisión del usuario, no un efecto lateral.
   */
  async remove(id: number): Promise<void> {
    // Con relaciones de una: 404 y conteo en la misma query. getCount() de
    // TypeORM hace COUNT(DISTINCT category.id) (= 1), no cuenta productos.
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: { products: true },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    const productCount = category.products?.length ?? 0;
    if (productCount > 0) {
      throw new ConflictException(
        `La categoría tiene ${productCount} producto(s) asociado(s). Reasígnalos o elimínalos primero.`,
      );
    }

    await this.categoryRepo.remove(category);
  }

  private normalizeName(name: string): string {
    const trimmed = (name ?? '').trim().replace(/\s+/g, ' ');
    if (!trimmed) throw new BadRequestException('El nombre de la categoría es obligatorio');
    return trimmed;
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const duplicate = await this.categoryRepo
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name })
      .getOne();
    if (duplicate) {
      throw new ConflictException(`Ya existe la categoría "${duplicate.name}"`);
    }
  }
}
