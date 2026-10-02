import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ClientEntity } from "./client.entity";

/**
 * Empresa: agrupa clientes (sucursales) que comparten un RUT real.
 * Invariantes (spec `companies`): toda empresa tiene >=1 cliente; el rut es
 * significativo (>=7 caracteres, no solo ceros) — la basura nunca agrupa.
 * Formalización de la antigua ClientGroupEntity (portado de ABAGAS,
 * openspec/changes/archive/2026-10-01-empresas-gestion).
 */
@Entity()
export class CompanyEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true, length: 20 })
  rut_normalizado: string = '';

  @Column()
  name: string = '';

  @Column({ default: true })
  active: boolean = true;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => ClientEntity, client => client.company)
  clients?: ClientEntity[];
}
