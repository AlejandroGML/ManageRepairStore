import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { TransactionEntity } from "./transaction.entity";

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  name: string = '';

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @Column({ default: 'seller' })
  role: 'admin' | 'seller' | 'warehouse' = 'seller';

  @Column({ default: true })
  active: boolean = true;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt?: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt?: Date;

  @OneToMany(() => TransactionEntity, (transaction) => transaction.operator)
  transactions?: TransactionEntity[];
}
