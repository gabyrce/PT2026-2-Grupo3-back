import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  productImageDirectory,
  productImageUrl,
  removeStoredProductImage,
} from './image-storage';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class ImgProductService {
  private readonly logger = new Logger(ImgProductService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    produtoId: number,
    usuarioId: number,
    imagem: Express.Multer.File,
  ) {
    const extension = this.validateImage(imagem);
    await this.findOwnedProduct(produtoId, usuarioId);

    const quantidade = await this.prisma.imagensProduto.count({
      where: { produto_id: produtoId },
    });
    if (quantidade >= 4) {
      throw new BadRequestException('O produto pode ter no máximo 4 imagens.');
    }

    const ultimaImagem = await this.prisma.imagensProduto.findFirst({
      where: { produto_id: produtoId },
      orderBy: { pedido: 'desc' },
      select: { pedido: true },
    });

    const filename = `${randomUUID()}.${extension}`;
    const path = join(productImageDirectory(), filename);
    const url = productImageUrl(filename);

    await mkdir(productImageDirectory(), { recursive: true });
    let fileWritten = false;
    try {
      await writeFile(path, imagem.buffer, { flag: 'wx' });
      fileWritten = true;
      return await this.prisma.imagensProduto.create({
        data: {
          produto_id: produtoId,
          image_url: url,
          pedido: (ultimaImagem?.pedido ?? 0) + 1,
        },
      });
    } catch (error) {
      if (fileWritten) {
        await this.removeFileAfterError(url);
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.imagensProduto.findMany({
      orderBy: [{ produto_id: 'asc' }, { pedido: 'asc' }],
    });
  }

  async findByProduct(produtoId: number) {
    const produto = await this.prisma.produtos.findUnique({
      where: { id: produtoId },
      select: { id: true },
    });
    if (!produto) {
      throw new NotFoundException('Produto não encontrado.');
    }

    return this.prisma.imagensProduto.findMany({
      where: { produto_id: produtoId },
      orderBy: { pedido: 'asc' },
    });
  }

  async findOne(id: number) {
    const imagem = await this.prisma.imagensProduto.findUnique({
      where: { id },
    });
    if (!imagem) {
      throw new NotFoundException('Imagem não encontrada.');
    }
    return imagem;
  }

  async update(id: number, usuarioId: number, arquivo: Express.Multer.File) {
    const extension = this.validateImage(arquivo);
    const imagem = await this.findOwnedImage(id, usuarioId);
    const filename = `${randomUUID()}.${extension}`;
    const path = join(productImageDirectory(), filename);
    const url = productImageUrl(filename);

    await mkdir(productImageDirectory(), { recursive: true });
    let fileWritten = false;
    try {
      await writeFile(path, arquivo.buffer, { flag: 'wx' });
      fileWritten = true;
      const atualizada = await this.prisma.imagensProduto.update({
        where: { id },
        data: { image_url: url },
      });
      await this.removeFileAfterSuccess(imagem.image_url);
      return atualizada;
    } catch (error) {
      if (fileWritten) {
        await this.removeFileAfterError(url);
      }
      throw error;
    }
  }

  async remove(id: number, usuarioId: number) {
    const imagem = await this.findOwnedImage(id, usuarioId);
    const removida = await this.prisma.imagensProduto.delete({ where: { id } });
    await this.removeFileAfterSuccess(imagem.image_url);
    return removida;
  }

  private validateImage(file?: Express.Multer.File): string {
    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('Envie uma imagem.');
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('A imagem deve ter no máximo 5 MB.');
    }

    const extension = EXTENSIONS[file.mimetype];
    if (!extension || !this.hasImageSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException(
        'Envie uma imagem JPEG, PNG ou WebP válida.',
      );
    }
    return extension;
  }

  private hasImageSignature(buffer: Buffer, mime: string): boolean {
    if (mime === 'image/jpeg') {
      return (
        buffer.length >= 3 &&
        buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
      );
    }
    if (mime === 'image/png') {
      return (
        buffer.length >= 8 &&
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    }
    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  private async findOwnedProduct(produtoId: number, usuarioId: number) {
    const produto = await this.prisma.produtos.findUnique({
      where: { id: produtoId },
      include: { loja: true },
    });
    if (!produto) {
      throw new NotFoundException('Produto não encontrado.');
    }
    if (produto.loja.usuario_id !== usuarioId) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar imagens deste produto.',
      );
    }
    return produto;
  }

  private async findOwnedImage(id: number, usuarioId: number) {
    const imagem = await this.prisma.imagensProduto.findUnique({
      where: { id },
      include: { produto: { include: { loja: true } } },
    });
    if (!imagem) {
      throw new NotFoundException('Imagem não encontrada.');
    }
    if (imagem.produto.loja.usuario_id !== usuarioId) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar esta imagem.',
      );
    }
    return imagem;
  }

  private async removeFileAfterError(url: string) {
    try {
      await removeStoredProductImage(url);
    } catch (error) {
      this.logger.warn(
        `Não foi possível limpar o arquivo após uma falha: ${String(error)}`,
      );
    }
  }

  private async removeFileAfterSuccess(url: string) {
    try {
      await removeStoredProductImage(url);
    } catch (error) {
      this.logger.warn(
        `Não foi possível remover o arquivo antigo: ${String(error)}`,
      );
    }
  }
}
