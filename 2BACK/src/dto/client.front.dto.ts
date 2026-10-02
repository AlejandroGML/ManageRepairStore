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

  /** Flujo empresas: empresa elegida y marca "Es empresa". */
  company_id?: number | null;

  @IsString()
  company_name?: string;
}
