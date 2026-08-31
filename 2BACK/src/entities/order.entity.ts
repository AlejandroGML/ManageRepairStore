import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ClientEntity } from "./client.entity";
import { RefillGroupEntity } from "./refill-group.entity";
import { OrderStatus } from "../order/order-status.enum";

@Entity()
export class OrderEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({nullable: true})
  description?: string;
  @Column({nullable: true})
  observation?: string;
  @Column({nullable: true})
  date?: Date;
  @Column({ type: 'varchar', default: OrderStatus.PENDIENTE })
  status: OrderStatus = OrderStatus.PENDIENTE;
  @Column({default:''})
  comment?: string;

  @ManyToOne(() => ClientEntity, order => order.orders)
  client?: ClientEntity;

  @OneToMany(() => RefillGroupEntity, (rg) => rg.order)
  refillGroups?: RefillGroupEntity[];
}