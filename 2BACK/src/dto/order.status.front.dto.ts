import { IsNotEmpty, IsString } from 'class-validator';

export class OrderStatusFront {
  id?: number;
  @IsString()
  @IsNotEmpty({message:'status: String, No debería estar vacío'})
  status: string = '';

  @IsString()
  @IsNotEmpty({message:'status: String, No debería estar vacío'})
  comment: string = '';
}
