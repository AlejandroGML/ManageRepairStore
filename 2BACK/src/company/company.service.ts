import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CompanyEntity } from '../entities/company.entity';
import { ClientEntity } from '../entities/client.entity';
import { normalize } from '../client/duplicate-matcher';

export interface CompanyListRow {
  id?: number;
  name: string;
  rutNormalizado: string;
  branchCount: number;
}

export interface CompanyListResult {
  items: CompanyListRow[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Empresas (spec `companies`): listado paginado para el modal de gestión y
 * el autocomplete del registro; renombre con validación de duplicados.
 * La creación de empresas vive en el flujo de registrar orden — aquí no se
 * crean ni se eliminan.
 */
@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(ClientEntity)
    private readonly clientRepository: Repository<ClientEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /** Listado paginado (default 10/página) con conteo de sucursales activas. */
  async list(page = 1, limit = 10, q = ''): Promise<CompanyListResult> {
    const capped = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const term = `%${(q ?? '').replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

    const qb = this.companyRepository
      .createQueryBuilder('co')
      .where('co.active = true')
      .select(['co.id', 'co.name', 'co.rut_normalizado', 'co.created_at'])
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(c.id)')
            .from('client_entity', 'c')
            .where('c.company_id = co.id AND c.active = true'),
        'branch_count',
      );
    if ((q ?? '').trim()) {
      qb.andWhere('(co.name ILIKE :term OR co.rut_normalizado ILIKE :term)', { term });
    }

    const total = await qb.getCount();
    const rows = await qb
      .orderBy('co.name', 'ASC')
      .offset((safePage - 1) * capped)
      .limit(capped)
      .getRawAndEntities();

    const items = rows.entities.map((co, i) => ({
      id: co.id,
      name: co.name,
      rutNormalizado: co.rut_normalizado,
      branchCount: Number(rows.raw[i]?.branch_count ?? 0),
    }));

    return { items, total, page: safePage, limit: capped };
  }

  /** Sucursales (clientes activos) de una empresa — selector del registro. */
  async getClients(companyId: number): Promise<ClientEntity[]> {
    if (!Number.isInteger(companyId) || companyId <= 0) {
      throw new BadRequestException('companyId inválido');
    }
    return this.clientRepository.find({
      where: { company_id: companyId, active: true },
      order: { id: 'ASC' },
    });
  }

  /**
   * Renombrar empresa (única acción del modal). Rechaza nombre vacío y
   * colisiones normalizadas con otra empresa activa (409). Corre en UNA
   * transacción con advisory lock por nombre normalizado (mismo patrón que
   * client.service) para que dos renombres concurrentes al mismo nombre no
   * creen gemelas (B7, post-Judgment Day).
   */
  async rename(id: number, name: string): Promise<CompanyEntity> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('companyId inválido');
    }
    if (typeof name !== 'string') {
      throw new BadRequestException('El nombre de la empresa debe ser texto');
    }
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('El nombre de la empresa no puede estar vacío');
    }
    const normalized = normalize(trimmed);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [normalized]);
      const company = await queryRunner.manager.findOne(CompanyEntity, { where: { id } });
      if (!company || !company.active) {
        throw new NotFoundException(`Empresa #${id} no encontrada`);
      }
      const all = await queryRunner.manager.find(CompanyEntity, { where: { active: true } });
      const clash = all.find((c) => c.id !== id && normalize(c.name) === normalized);
      if (clash) {
        throw new ConflictException(`Ya existe una empresa con ese nombre: "${clash.name}"`);
      }
      company.name = trimmed;
      const saved = await queryRunner.manager.save(CompanyEntity, company);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
