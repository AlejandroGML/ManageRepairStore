import { Column, Entity, OneToMany, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { TransactionEntity } from './transaction.entity';
import { CategoryEntity } from './category.entity';

@Entity()
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ default: '' })
  name: string = '';

  @Column({ default: true })
  active: boolean = true;

  @Column({ nullable: true }) // Nueva columna para la imagen
  image?: string;

  @Column({ type: 'int', default: 0 })
  stock: number = 0;

  @OneToMany(() => TransactionEntity, (transaction) => transaction.product, { cascade: true })
  transactions?: TransactionEntity[];

  @ManyToOne(() => CategoryEntity, (category) => category.products)
  category?: CategoryEntity;
}
