import { IsEmail, IsString, IsOptional, MinLength, IsIn, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Debe ser un email válido' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @IsOptional()
  @IsIn(['admin', 'seller', 'warehouse'], { message: 'Rol inválido: debe ser admin, seller o warehouse' })
  role?: 'admin' | 'seller' | 'warehouse';

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser booleano' })
  active?: boolean;
}
