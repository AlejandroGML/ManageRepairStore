import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { OrderEntity } from './order.entity';
import { TransactionEntity } from './transaction.entity';

@Entity('refill_groups')
export class RefillGroupEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @CreateDateColumn()
  createdAt?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalValue: number = 0;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  technician?: UserEntity;

  @ManyToOne(() => OrderEntity, { nullable: true, onDelete: 'SET NULL' })
  order?: OrderEntity;

  @OneToMany(() => TransactionEntity, (tx) => tx.refillGroup)
  transactions?: TransactionEntity[];

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  operator?: UserEntity;
}
