import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  profileImageDirectory,
  profileImageUrl,
  removeStoredProfileImage,
} from './image-storage';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class ProfileImageService {
  private readonly logger = new Logger(ProfileImageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async update(usuarioId: number, imagem: Express.Multer.File) {
    const extension = this.validateImage(imagem);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, profile_picture_url: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const filename = `${randomUUID()}.${extension}`;
    const path = join(profileImageDirectory(), filename);
    const url = profileImageUrl(filename);

    await mkdir(profileImageDirectory(), { recursive: true });

    let fileWritten = false;

    try {
      await writeFile(path, imagem.buffer, { flag: 'wx' });
      fileWritten = true;

      const atualizado = await this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { profile_picture_url: url },
        select: {
          id: true,
          nome: true,
          username: true,
          email: true,
          profile_picture_url: true,
        },
      });

      if (usuario.profile_picture_url) {
        await this.removeFileAfterSuccess(usuario.profile_picture_url);
      }

      return atualizado;
    } catch (error) {
      if (fileWritten) {
        await this.removeFileAfterError(url);
      }

      throw error;
    }
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
        buffer.subarray(0, 8).equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        )
      );
    }

    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  private async removeFileAfterError(url: string) {
    try {
      await removeStoredProfileImage(url);
    } catch (error) {
      this.logger.warn(
        `Não foi possível limpar o arquivo após uma falha: ${String(error)}`,
      );
    }
  }

  private async removeFileAfterSuccess(url: string) {
    try {
      await removeStoredProfileImage(url);
    } catch (error) {
      this.logger.warn(
        `Não foi possível remover a foto antiga: ${String(error)}`,
      );
    }
  }
}
