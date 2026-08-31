import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { TransactionEntity } from './transaction.entity';

@Entity('sales')
export class SaleEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number = 0;

  @Column('jsonb', { nullable: true })
  snapshot?: any;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt?: Date;

  @OneToMany(() => TransactionEntity, (transaction) => transaction.sale)
  transactions?: TransactionEntity[];
}
