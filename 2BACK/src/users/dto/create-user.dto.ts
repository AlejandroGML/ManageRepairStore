import { IsEmail, IsNotEmpty, IsString, MinLength, IsIn } from 'class-validator';
import { CreateUserDto as SharedCreateUserDto } from '@shared/interfaces';

export class CreateUserDto implements SharedCreateUserDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name!: string;

  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email!: string;

  @IsString({ message: 'La contraseña debe ser texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @IsString({ message: 'El rol debe ser texto' })
  @IsIn(['admin', 'seller', 'warehouse'], { message: 'Rol inválido: debe ser admin, seller o warehouse' })
  role!: 'admin' | 'seller' | 'warehouse';
}
