import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  // lista todos os produtos.
  async findAll() {
    return this.prisma.produtos.findMany({
      include: {
        loja: true,
        categoria: true,
        imagens: true,
      },
    });
  }

  // aqui ele busca um produto pelo ID.
  async findOne(id: number) {
    const produto = await this.prisma.produtos.findUnique({
      where: { id },
      include: {
        loja: true,
        categoria: true,
        imagens: true,
      },
    });

    if (!produto) {
      throw new NotFoundException('Produto não encontrado.');
    }

    return produto;
  }

    async update(
    id: number,
    dto: UpdateProductDto,
    usuarioId: number,
  ) {
    const produto = await this.prisma.produtos.findUnique({
      where: { id },
      include: {
        loja: true,
      },
    });

    if (!produto) {
      throw new NotFoundException('Produto não encontrado.');
    }

    if (produto.loja.usuario_id !== usuarioId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este produto.',
      );
    }

    return this.prisma.produtos.update({
      where: { id },
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        preco: dto.preco,
        stock: dto.stock,
      },
    });
  }

  async remove(id: number, usuarioId: number) {
    const produto = await this.prisma.produtos.findUnique({
      where: { id },
      include: {
        loja: true,
      },
    });

    if (!produto) {
      throw new NotFoundException('Produto não encontrado.');
    }

    if (produto.loja.usuario_id !== usuarioId) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir este produto.',
      );
    }

    return this.prisma.produtos.delete({
      where: { id },
    });
  }

  // depois ele cadastra um produto.
  async create(dto: CreateProductDto, usuarioId: number) {
    // verifica se a loja existe.
    const loja = await this.prisma.lojas.findUnique({
      where: { id: dto.loja_id },
    });

    if (!loja) {
      throw new NotFoundException('Loja não encontrada.');
    }

    // Verifica se o usuário é dono da loja.
    if (loja.usuario_id !== usuarioId) {
      throw new ForbiddenException(
        'Você não tem permissão para adicionar produtos a esta loja.',
      );
    }

    // verifica se a categoria existe.
    const categoria = await this.prisma.categorias.findUnique({
      where: { id: dto.categoria_id },
    });

    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    // cria o produto.
    return this.prisma.produtos.create({
      data: {
        loja_id: dto.loja_id,
        categoria_id: dto.categoria_id,
        nome: dto.nome,
        descricao: dto.descricao,
        preco: dto.preco,
        stock: dto.stock,
      },
    });
  }
}
