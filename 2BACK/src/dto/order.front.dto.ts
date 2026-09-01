import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OrderFront {
  clientId?: number;
  
  @IsString({message:'name: String'})
  @IsNotEmpty({message:'name:No debería estar vacío'})
  name!: string;

  @IsString({message:'rut: String'})
  @IsNotEmpty({message:'rut:No debería estar vacío'})
  rut!: string;

  @IsString({message:'address: String'})
  @IsNotEmpty({message:'address:No debería estar vacío'})
  address!: string;

  @IsString({message:'city: String'})
  @IsNotEmpty({message:'city:No debería estar vacío'})
  city!: string;

  @IsString({message:'phone: String'})
  @IsNotEmpty({message:'phone:No debería estar vacío '})
  phone!: string;

  @IsOptional()
  date?: Date;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString({message:'description: String'})
  @IsNotEmpty({message:'description:No debería estar vacío'})
  description!: string;

  @IsString({message:'observation: String'})
  @IsNotEmpty({message:'observation:No debería estar vacío'})
  observation!: string;

  @IsString({message:'status: String'})
  @IsNotEmpty({message:'status: No debería estar vacío'})
  status!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  total?: number;

  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsString()
  rut_normalizado?: string;
}
