import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class LogEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  userName: string = '';

  @Column()
  clientId: number = 0;

  @Column()
  clientName: string = '';

  @Column()
  action: string = '';

  @Column({nullable: true})
  date?: Date;

}
