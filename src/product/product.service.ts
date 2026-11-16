import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { removeStoredProductImage } from '../img_product/image-storage';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly prisma: PrismaService) {}

  // lista os produtos e filtra pelo nome quando há uma busca.
  async findAll(busca?: string) {
    const termo = typeof busca === 'string' ? busca.trim() : '';

    return this.prisma.produtos.findMany({
      where: termo ? { nome: { contains: termo } } : undefined,
      include: {
        loja: true,
        categoria: true,
        imagens: true,
      },
    });
  }

    async findByUsuario(usuarioId: number) {
    return this.prisma.produtos.findMany({
      where: {
        loja: {
          usuario_id: usuarioId,
        },
      },
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

  async update(id: number, dto: UpdateProductDto, usuarioId: number) {
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
        imagens: { select: { image_url: true } },
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

    const removido = await this.prisma.$transaction(async (tx) => {
      await tx.imagensProduto.deleteMany({ where: { produto_id: id } });
      return tx.produtos.delete({ where: { id } });
    });

    for (const imagem of produto.imagens) {
      try {
        await removeStoredProductImage(imagem.image_url);
      } catch (error) {
        this.logger.warn(
          `Não foi possível remover uma imagem do produto: ${String(error)}`,
        );
      }
    }

    return removido;
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
