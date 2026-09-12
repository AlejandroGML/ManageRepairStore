import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1, { message: 'El nombre de la categoría es obligatorio' })
  @MaxLength(80, { message: 'El nombre no puede superar 80 caracteres' })
  name!: string;
}

export class UpdateCategoryDto extends CreateCategoryDto {}
