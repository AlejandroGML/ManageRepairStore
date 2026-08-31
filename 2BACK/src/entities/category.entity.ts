import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { ProductEntity } from "./product.entity";

@Entity()
export class CategoryEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  name: string = '';

  @OneToMany(() => ProductEntity, (product) => product.category)
  products?: ProductEntity[];
}