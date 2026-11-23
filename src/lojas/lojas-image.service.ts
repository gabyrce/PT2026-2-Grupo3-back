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
  storeImageDirectory,
  storeImageUrl,
  removeStoredStoreImage,
} from './image-storage';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

type StoreImageFiles = {
  sticker?: Express.Multer.File[];
  logo?: Express.Multer.File[];
  banner?: Express.Multer.File[];
};

@Injectable()
export class LojasImageService {
  private readonly logger = new Logger(LojasImageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upload(
    lojaId: number,
    usuarioId: number,
    files: StoreImageFiles,
  ) {
    const loja = await this.findOwnedStore(lojaId, usuarioId);

    const imagens = [
      { field: 'sticker', file: files.sticker?.[0], column: 'sticker_url' },
      { field: 'logo', file: files.logo?.[0], column: 'logo_url' },
      { field: 'banner', file: files.banner?.[0], column: 'banner_url' },
    ].filter((item) => item.file) as {
      field: string;
      file: Express.Multer.File;
      column: 'sticker_url' | 'logo_url' | 'banner_url';
    }[];

    if (imagens.length === 0) {
      throw new BadRequestException('Envie pelo menos uma imagem.');
    }

    for (const imagem of imagens) {
      this.validateImage(imagem.file);
    }

    await mkdir(storeImageDirectory(), { recursive: true });

    const arquivosSalvos: string[] = [];
    const urlsAntigas: string[] = [];
    const dados: Partial<
      Record<'sticker_url' | 'logo_url' | 'banner_url', string>
    > = {};

    try {
      for (const imagem of imagens) {
        const extension = this.validateImage(imagem.file);
        const filename = `${randomUUID()}.${extension}`;
        const path = join(storeImageDirectory(), filename);
        const url = storeImageUrl(filename);

        await writeFile(path, imagem.file.buffer, { flag: 'wx' });
        arquivosSalvos.push(url);

        dados[imagem.column] = url;

        const urlAntiga = loja[imagem.column];
        if (urlAntiga) {
          urlsAntigas.push(urlAntiga);
        }
      }

      const lojaAtualizada = await this.prisma.lojas.update({
        where: { id: lojaId },
        data: dados,
        include: { categoria: true },
      });

      for (const url of urlsAntigas) {
        await this.removeFileAfterSuccess(url);
      }

      return lojaAtualizada;
    } catch (error) {
      for (const url of arquivosSalvos) {
        await this.removeFileAfterError(url);
      }

      throw error;
    }
  }

  private validateImage(file?: Express.Multer.File): string {
    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('Envie uma imagem válida.');
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

  private async findOwnedStore(lojaId: number, usuarioId: number) {
    const loja = await this.prisma.lojas.findUnique({
      where: { id: lojaId },
    });

    if (!loja) {
      throw new NotFoundException('Loja não encontrada.');
    }

    if (loja.usuario_id !== usuarioId) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar imagens desta loja.',
      );
    }

    return loja;
  }

  private async removeFileAfterError(url: string) {
    try {
      await removeStoredStoreImage(url);
    } catch (error) {
      this.logger.warn(
        `Não foi possível limpar o arquivo após uma falha: ${String(error)}`,
      );
    }
  }

  private async removeFileAfterSuccess(url: string) {
    try {
      await removeStoredStoreImage(url);
    } catch (error) {
      this.logger.warn(
        `Não foi possível remover o arquivo antigo: ${String(error)}`,
      );
    }
  }
}
