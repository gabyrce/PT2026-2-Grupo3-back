
import {
  IsInt,
  IsString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsInt()
  @Min(1)
  loja_id: number;

  @IsInt()
  @Min(1)
  categoria_id: number;

  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsNumber()
  @Min(0)
  preco: number;

  @IsInt()
  @Min(0)
  stock: number;
}
