import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UploadedFiles,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { LojasService } from './lojas.service';
import { LojasImageService } from './lojas-image.service';
import type { lojasdto } from './lojas.dto';
import { Public } from '../auth/decorators/isPublic.decorator';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { UserPayload } from '../auth/types/UserPayload';

@Controller('lojas')
export class LojasController {
  constructor(
    private readonly lojasService: LojasService,
    private readonly lojasImageService: LojasImageService,
  ) {}

  @Post()
  create(
    @Body() data: Omit<lojasdto, 'usuario_id'>,
    @CurrentUser() currentUser: UserPayload,
  ) {
    return this.lojasService.create({
      ...data,
      usuario_id: currentUser.sub,
    });
  }

  @Post(':id/imagens')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'sticker', maxCount: 1 },
        { name: 'logo', maxCount: 1 },
        { name: 'banner', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 5 * 1024 * 1024,
          files: 3,
        },
      },
    ),
  )
  uploadImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles()
    files: {
      sticker?: Express.Multer.File[];
      logo?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    },
    @CurrentUser() currentUser: UserPayload,
  ) {
    return this.lojasImageService.upload(id, currentUser.sub, files);
  }

  @Get()
  findAll() {
    return this.lojasService.findAll();
  }

  @Public()
  @Get('usuario/:usuarioId')
  async findByUsuario(@Param('usuarioId') usuarioId: string) {
    return this.lojasService.findByUsuario(Number(usuarioId));
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.lojasService.findOne(Number(id));
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: lojasdto) {
    return this.lojasService.update(Number(id), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.lojasService.delete(Number(id));
  }
}
