import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientEntity } from '../entities/client.entity';
import { ClientGroupEntity } from '../entities/client-group.entity';
import {
  DuplicateCheckInput,
  DuplicateMatch,
  findDuplicates,
  normalize,
} from './duplicate-matcher';

export interface CompanyInfo {
  name: string;
  rut?: string;
  sucursales: number;
}

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(ClientEntity)
    private clientRepository: Repository<ClientEntity>,
    @InjectRepository(ClientGroupEntity)
    private groupRepository: Repository<ClientGroupEntity>,
  ) {}

  async getClientsByRut(rut: string): Promise<ClientEntity[]> {
    const clients: ClientEntity[] = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.rut_raw ILIKE :rut AND client.active = true', { rut: `%${rut}%` })
      .getMany();
    return clients;
  }

  async getAllUsers(): Promise<ClientEntity[]> {
    try {
      return await this.clientRepository.find();
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async getClientHierarchy(clientId: number): Promise<ClientEntity[]> {
    const client = await this.clientRepository.findOne({ where: { id: clientId } });
    if (!client) return [];
    const groupId = client.group_id;
    if (groupId == null) return [client];
    return this.clientRepository.find({ where: { group_id: groupId } } as any);
  }

  async getGroupClients(groupId: number): Promise<ClientEntity[]> {
    return this.clientRepository.find({ where: { group_id: groupId } } as any);
  }

  async getCountUsers(): Promise<number> {
    try {
      return await this.clientRepository.count();
    } catch (error) {
      console.log(error);
      return 0;
    }
  }

  async getUserById(id: number): Promise<ClientEntity | null> {
    return await this.clientRepository.findOne({where: {id:id,'active':true}});
  }

  async getUsersByName(name: string): Promise<ClientEntity[]> {
    const clients: ClientEntity[] = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.name ILIKE :name AND client.active = true', { name: `%${name}%` })
      .getMany();
    return clients;
  }

  async getUsersByAddress(address: string): Promise<ClientEntity[]> {
    const clients: ClientEntity[] = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.address ILIKE :address AND client.active = true', { address: `%${address}%` })
      .getMany();
    return clients;
  }

  /**
   * Empresas ya inscritas (autocomplete de "Registrar orden"): cada empresa
   * distinta con un RUT representativo y su cantidad de sucursales.
   */
  async getCompanies(): Promise<CompanyInfo[]> {
    const rows = await this.clientRepository
      .createQueryBuilder('c')
      .select('c.company_name', 'name')
      .addSelect('MAX(c.rut_normalizado)', 'rut')
      .addSelect('COUNT(c.id)', 'sucursales')
      .where('c.active = :active', { active: true })
      .andWhere("c.company_name IS NOT NULL AND c.company_name != ''")
      .groupBy('c.company_name')
      .orderBy('c.company_name', 'ASC')
      .getRawMany();
    return rows.map((r) => ({
      name: String(r.name ?? ''),
      rut: r.rut || undefined,
      sucursales: Number(r.sucursales ?? 0),
    }));
  }

  /**
   * Anti-duplicados: busca clientes activos que coincidan por alguno de los
   * campos (RUT, teléfono, correo, nombre, dirección, empresa) usando el
   * matcher normalizado + difuso.
   */
  async checkDuplicates(input: DuplicateCheckInput): Promise<{ count: number; matches: DuplicateMatch[] }> {
    const candidates = await this.clientRepository
      .createQueryBuilder('c')
      .select([
        'c.id', 'c.name', 'c.rut_raw', 'c.rut_normalizado',
        'c.address', 'c.city', 'c.phone', 'c.email', 'c.company_name',
      ])
      .where('c.active = :active', { active: true })
      .getMany();

    const matches = findDuplicates(candidates, input);
    return { count: matches.length, matches };
  }

  /**
   * Búsqueda server-side para el finder (evitar descargar todos los
   * clientes en cada visita). Coincidencia parcial ILIKE por el campo
   * elegido, con conteo de órdenes por cliente.
   */
  async searchClients(
    q: string,
    field: string,
    limit = 100,
  ): Promise<{ items: Array<ClientEntity & { orderCount: number }>; total: number }> {
    const capped = Math.min(Math.max(limit, 1), 100);
    const term = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

    const qb = this.clientRepository.createQueryBuilder('c');
    switch (field) {
      case 'id':
        qb.where('CAST(c.id AS TEXT) ILIKE :term', { term });
        break;
      case 'rut': {
        const digits = `%${q.replace(/[.\-\s]/g, '')}%`;
        qb.where(
          "REPLACE(REPLACE(c.rut_raw, '.', ''), '-', '') ILIKE :digits " +
            "OR REPLACE(REPLACE(c.rut_normalizado, '.', ''), '-', '') ILIKE :digits",
          { digits },
        );
        break;
      }
      case 'email':
        qb.where('c.email ILIKE :term', { term });
        break;
      case 'company':
        qb.where('c.company_name ILIKE :term', { term });
        break;
      case 'city':
        qb.where('c.city ILIKE :term', { term });
        break;
      default:
        qb.where('c.name ILIKE :term', { term });
        break;
    }

    const total = await qb.getCount();
    const rows = await qb
      .addSelect(
        (sub) => sub.select('COUNT(o.id)').from('order_entity', 'o').where('o."clientId" = c.id'),
        'order_count',
      )
      .orderBy('c.id', 'DESC')
      .take(capped)
      .getRawAndEntities();

    const items = rows.entities.map((c, i) => ({
      ...c,
      orderCount: Number(rows.raw[i]?.order_count ?? 0),
    }));
    return { items, total };
  }

  /**
   * Export XLSX de clientes (botón "Exportar todos los Clientes").
   * ExcelJS permite formato real: encabezado con marca, zebra entre filas,
   * anchos calculados según contenido, paneles congelados y autofiltro.
   * CSV no puede llevar formato; XLSX abre en Excel/LibreOffice/Sheets.
   */
  async buildClientsXlsx(): Promise<ExcelJS.Buffer> {
    const rows = await this.clientRepository
      .createQueryBuilder('c')
      .select([
        'c.id', 'c.name', 'c.rut_raw', 'c.phone',
        'c.email', 'c.address', 'c.city', 'c.company_name',
      ])
      .orderBy('c.id', 'ASC')
      .getRawMany();

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Clientes');

    const headers = ['N°', 'Nombre', 'RUT', 'Teléfono', 'Email', 'Dirección', 'Ciudad', 'Empresa'] as const;
    const valuesFor = (r: any): (string | number)[] => [
      Number(r.c_id ?? 0),
      r.c_name ?? '',
      r.c_rut_raw ?? '',
      r.c_phone ?? '',
      r.c_email ?? '',
      r.c_address ?? '',
      r.c_city ?? '',
      r.c_company_name || 'Particular',
    ];

    // Encabezado
    const headerRow = sheet.addRow([...headers]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
      cell.alignment = { vertical: 'middle' };
    });

    // Filas con zebra
    rows.forEach((r, i) => {
      const row = sheet.addRow(valuesFor(r));
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        });
      }
    });

    // Anchos calculados según el contenido (cap 45)
    const widths = headers.map((_, col) => {
      let max = headers[col].length;
      for (const r of rows) {
        const v = String(valuesFor(r)[col] ?? '');
        if (v.length > max) max = v.length;
      }
      return Math.min(max + 3, 45);
    });
    sheet.columns.forEach((col, i) => (col.width = widths[i]));

    // Fila de encabezado congelada + autofiltro
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

    return wb.xlsx.writeBuffer();
  }

  /**
   * Nombres se comparan normalizados (sin tildes/puntuación, espacios
   * colapsados): evita duplicados tipo "Juán Pérez" vs "Juan Perez".
   * Sucursales del mismo retail con nombre idéntico también colisionan:
   * es la regla que pidió el dueño del sistema.
   */
  private async assertNoNormalizedNameConflict(name: string, excludeId?: number): Promise<void> {
    const normalized = normalize(name);
    if (!normalized) return;
    const all = await this.clientRepository.find({
      where: { active: true },
      select: { id: true, name: true },
    });
    const conflict = all.find(
      (c) => c.id !== excludeId && normalize(c.name) === normalized,
    );
    if (conflict) {
      throw new HttpException(
        `Ya existe un cliente similar: "${conflict.name}" (#${conflict.id})`,
        HttpStatus.CONFLICT,
      );
    }
  }

  async createUser(user: ClientEntity): Promise<ClientEntity> {
    await this.assertNoNormalizedNameConflict(user.name);
    if (!user.group) {
      if (user.rut_normalizado) {
        const existing = await this.groupRepository.findOne({
          where: { rut_normalizado: user.rut_normalizado },
        });
        user.group = existing || await this.groupRepository.save({
          rut_normalizado: user.rut_normalizado,
          name: user.name,
          active: true,
        });
      } else {
        user.group = await this.groupRepository.save({
          rut_normalizado: null,
          name: user.name,
          active: true,
        });
      }
    }
    return await this.clientRepository.save(user);
  }

  async updateUserById(id: number, newUser: ClientEntity): Promise<ClientEntity> {
    const userToUpdate = await this.clientRepository.findOne({where: {id:id,active:true}});
    if (!userToUpdate) {
      throw new Error(`User with id ${id} not found.`);
    }
    if (newUser.name && newUser.name !== userToUpdate.name) {
      await this.assertNoNormalizedNameConflict(newUser.name, id);
    }
    const updatedUser = Object.assign(userToUpdate, newUser);
    return await this.clientRepository.save(updatedUser);
  }

  async deleteUserById(id: number): Promise<void> {
    const userToDelete: ClientEntity | null = await this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.orders', 'orders')
      .where('client.id = :id', { id })
      .getOne();
    if (!userToDelete) {
      throw new Error(`User with id ${id} not found.`);
    }
    userToDelete.active = false;
    await this.clientRepository.save(userToDelete);
  }
}
