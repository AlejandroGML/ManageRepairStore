import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { OrderEntity } from "./order.entity";
import { ClientGroupEntity } from "./client-group.entity";

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

  @Column({ nullable: true })
  company_name?: string;

  @Column({default:true})
  active?: boolean;

  @Column()
  group_id: number;

  @ManyToOne(() => ClientGroupEntity, group => group.clients, { nullable: false })
  @JoinColumn({ name: 'group_id' })
  group!: ClientGroupEntity;

  @OneToMany(() => OrderEntity, order => order.client,{cascade:true})
  orders?: OrderEntity[];
}