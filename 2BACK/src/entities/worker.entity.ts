import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Trabajador del taller: pool global para asignaciones de repuestos.
 *  Por ahora solo lleva nombre (sin usuario ni credenciales). */
@Entity()
export class WorkerEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ default: '' })
  name: string = '';
}
