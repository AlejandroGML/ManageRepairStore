import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ProductEntity } from "./product.entity";
import { UserEntity } from "./user.entity";
import { SaleEntity } from './sale.entity';
import { RefillGroupEntity } from './refill-group.entity';

@Entity()
export class TransactionEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ nullable: false })
  operation: string = '';

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt?: Date;

  @Column({ type: 'int', nullable: true })
  quantity?: number;

  @Column({ nullable: true })
  costPrice?: number;

  @Column({ nullable: true })
  sellingPrice?: number;

  @Column({ nullable: true })
  maxDiscount?: number;

  @Column({ default: '' })
  location: string = '';

  @Column({ default: '' })
  payMethod: string = '';

  @Column({ type: 'int', nullable: true })
  finalStock?: number;

  @Column({ nullable: true })
  purchaseDiscount?: number;

  @Column({ nullable: true })
  finalValue?: number;

  @Column({ default: false })
  deleted: boolean = false;

  @Column({ nullable: true })
  assignedWorker?: string;

  @Column({ nullable: true })
  description?: string;

  // Almacena solo los valores necesarios en cada transacción
  @Column({ type: 'json', nullable: true })
  snapshotData?: Record<string, any>;

  @ManyToOne(() => ProductEntity, (product) => product.transactions, { onDelete: 'CASCADE' })
  product?: ProductEntity;

  @ManyToOne(() => UserEntity, (user) => user.transactions, { nullable: true, onDelete: 'SET NULL' })
  operator?: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.transactions, { nullable: true, onDelete: 'SET NULL' })
  manager?: UserEntity;

  @ManyToOne(() => SaleEntity, (sale) => sale.transactions, { nullable: true, onDelete: 'CASCADE' })
  sale?: SaleEntity;

  @ManyToOne(() => RefillGroupEntity, (rg) => rg.transactions, { nullable: true, onDelete: 'SET NULL' })
  refillGroup?: RefillGroupEntity;
}