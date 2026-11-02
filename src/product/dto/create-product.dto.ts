export class CreateProductDto {
  loja_id: number;
  categoria_id: number;
  nome: string;
  descricao?: string;
  preco: number;
  stock: number;
}
