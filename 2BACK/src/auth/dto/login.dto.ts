import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { LoginDto as SharedLoginDto } from '@shared/interfaces';

export class LoginDto implements SharedLoginDto {
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email!: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;
}
