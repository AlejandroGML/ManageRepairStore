import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ClientEntity } from "./client.entity";

@Entity()
export class ClientGroupEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true, length: 20, nullable: true })
  rut_normalizado?: string;

  @Column()
  name: string = '';

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  credit_limit: number = 0;

  @Column({ default: '' })
  payment_terms: string = '';

  @Column({ default: true })
  active: boolean = true;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => ClientEntity, client => client.group)
  clients?: ClientEntity[];
}
