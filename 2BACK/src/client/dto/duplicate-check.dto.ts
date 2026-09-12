import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** Entrada del chequeo anti-duplicados (datos del formulario de registrar orden). */
export class DuplicateCheckDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  rut?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsBoolean()
  has_company?: boolean;
}