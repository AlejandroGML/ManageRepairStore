import { IsInt, IsOptional, IsString } from 'class-validator';

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

  /**
   * Cliente ya seleccionado explícitamente (búsqueda en registrar orden):
   * se excluye de las coincidencias — no es un duplicado, ES el cliente.
   */
  @IsOptional()
  @IsInt()
  clientId?: number;

  /**
   * Empresa seleccionada explícitamente: sus sucursales se excluyen
   * (comparten rut por diseño — no son duplicados).
   */
  @IsOptional()
  @IsInt()
  companyId?: number;
}
