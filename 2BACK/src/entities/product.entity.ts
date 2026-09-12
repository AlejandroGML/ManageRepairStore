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

  /** Punto de reposición (prototipo: columna MÍNIMO). */
  @Column({ type: 'int', default: 5 })
  minimum: number = 5;

  /** Atributos vigentes del producto: se sincronizan con cada transacción
   *  (antes vivían solo en la última transaction, y el modal de edición
   *  mostraba valores de la última VENTA en vez del producto). */
  @Column({ type: 'int', default: 0 })
  costPrice: number = 0;

  @Column({ type: 'int', default: 0 })
  sellingPrice: number = 0;

  @Column({ type: 'int', default: 0 })
  maxDiscount: number = 0;

  @Column({ default: '' })
  location: string = '';

  @Column({ default: '' })
  description: string = '';

  @OneToMany(() => TransactionEntity, (transaction) => transaction.product, { cascade: true })
  transactions?: TransactionEntity[];

  @ManyToOne(() => CategoryEntity, (category) => category.products)
  category?: CategoryEntity;
}
