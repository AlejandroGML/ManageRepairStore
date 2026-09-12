import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class SalePdfItem {
  @IsString()
  name!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  sellingPrice!: number;

  @IsOptional()
  @IsNumber()
  purchaseDiscount?: number;

  @IsOptional()
  @IsNumber()
  finalValue?: number;
}

/** Datos del resumen de venta para generar el comprobante PDF. */
export class SalePdfDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  seller?: string;

  @IsArray()
  products!: SalePdfItem[];

  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  total?: number;
}