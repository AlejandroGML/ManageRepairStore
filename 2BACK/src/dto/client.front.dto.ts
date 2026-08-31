import { IsNotEmpty, IsString } from 'class-validator';
import { Client } from '@shared/interfaces';

export class FrontClient implements Client {
  @IsString({message:'Tipo: String'})
  @IsNotEmpty({message:'No debería estar vacío'})
  name: string = '';

  @IsString({message:'Tipo: String'})
  @IsNotEmpty({message:'No debería estar vacío'})
  rut_raw: string = '';

  @IsString({message:'Tipo: String'})
  @IsNotEmpty({message:'No debería estar vacío'})
  address: string = '';

  @IsString({message:'Tipo: String'})
  @IsNotEmpty({message:'No debería estar vacío'})
  city: string = '';

  @IsString({message:'Tipo: String'})
  phone: string = '';

  date?: string;

  @IsString()
  email?: string;

  @IsString()
  company_name?: string;
}
