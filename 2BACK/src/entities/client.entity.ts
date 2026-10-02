import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { OrderEntity } from "./order.entity";
import { CompanyEntity } from "./company.entity";

@Entity()
export class ClientEntity {
  @PrimaryGeneratedColumn()
  id?: number;
  @Column()
  name: string = '';

  @Column()
  rut_raw: string = '';
  
  @Column()
  address: string = '';
  @Column()
  city: string = '';
  @Column({nullable:true})
  phone?: string;
  @Column({nullable:true})
  email?: string;

  @Column({nullable:true, length: 12})
  rut_normalizado?: string;

  @Column({default:true})
  active?: boolean;

  /** Empresa (sucursales comparten rut). NULL = cliente particular. */
  @Index('IDX_client_company_id')
  @Column({ nullable: true })
  company_id?: number | null;

  @ManyToOne(() => CompanyEntity, company => company.clients, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: CompanyEntity | null;

  @OneToMany(() => OrderEntity, order => order.client,{cascade:true})
  orders?: OrderEntity[];
}
