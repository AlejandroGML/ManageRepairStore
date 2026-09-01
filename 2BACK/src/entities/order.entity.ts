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

  /** Total de la orden (prototipo: columna TOTAL en Clientes). */
  @Column({ type: 'int', default: 0 })
  total: number = 0;

  /** Código de orden explícito (prototipo: ORD-1039..ORD-1042). */
  @Column({ nullable: true })
  code?: string;

  @ManyToOne(() => ClientEntity, order => order.orders)
  client?: ClientEntity;

  @OneToMany(() => RefillGroupEntity, (rg) => rg.order)
  refillGroups?: RefillGroupEntity[];
}