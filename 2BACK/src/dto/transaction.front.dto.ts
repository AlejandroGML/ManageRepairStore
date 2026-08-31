import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class TransactionFront {
  productId?: number;

  @IsString({ message: 'name -> tipo: String' })
  @IsNotEmpty({ message: 'No debería estar vacío' })
  name: string = '';

  @IsNotEmpty({ message: 'No debería estar vacío' })
  active: boolean = true;

  @IsString({ message: 'operation: String' })
  @IsNotEmpty({ message: 'operation: No debería estar vacío' })
  operation: string = '';

  @IsNotEmpty({ message: 'operation: No debería estar vacío' })
  createdAt: Date = new Date();

  @IsOptional()
  updatedAt?: Date;

  @IsNumber()
  @IsNotEmpty({ message: 'No debería estar vacío' })
  quantity: number = 0;

  @IsNumber()
  @IsNotEmpty({ message: 'No debería estar vacío' })
  costPrice: number = 0;

  @IsNumber()
  @IsNotEmpty({ message: 'No debería estar vacío' })
  sellingPrice: number = 0;

  @IsOptional()
  maxDiscount?: number;

  @IsString({ message: 'Location -> tipo: String' })
  location: string = '';

  @IsNumber()
  @IsNotEmpty({ message: 'No debería estar vacío' })
  finalStock?: number;

  @IsOptional()
  purchaseDiscount?: number;

  @IsOptional()
  finalValue?: number;

  @IsString({ message: 'operator: String' })
  @IsNotEmpty({ message: 'operator: No debería estar vacío' })
  operator: string = '';

  @IsOptional()
  manager: string = '';

  @IsOptional()
  assignedWorker?: string;

  @IsOptional()
  description?: string;

  @IsNotEmpty({ message: 'deleted: No debería estar vacío' })
  deleted: boolean = false;
}