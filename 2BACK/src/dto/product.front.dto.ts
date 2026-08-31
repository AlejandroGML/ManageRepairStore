import { IsNotEmpty, IsString } from 'class-validator';
import { TransactionEntity } from '../entities/transaction.entity';

export class FrontProduct {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  name: string = '';

  @IsString({ message: 'OperatorDeleted must be a string' })
  operatorDeleted?: string;

  @IsString({ message: 'WorkerDeleted must be a string' })
  workerDeleted?: string;

  stock?: number;

  transaction?: TransactionEntity;
}
