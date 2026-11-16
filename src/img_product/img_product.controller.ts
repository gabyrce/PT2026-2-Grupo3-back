import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';
import { ImgProductService } from './img_product.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { UserPayload } from '../auth/types/UserPayload';
import { Public } from '../auth/decorators/isPublic.decorator';

@Controller('img-product')
export class ImgProductController {
  constructor(private readonly imgProductService: ImgProductService) {}

  @Post(':produtoId')
  @UseInterceptors(
    FileInterceptor('imagem', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  create(
    @Param('produtoId', ParseIntPipe) produtoId: number,
    @UploadedFile() imagem: Express.Multer.File,
    @CurrentUser() currentUser: UserPayload,
  ) {
    return this.imgProductService.create(produtoId, currentUser.sub, imagem);
  }

  @Get()
  @Public()
  findAll() {
    return this.imgProductService.findAll();
  }

  @Get('product/:produtoId')
  @Public()
  findByProduct(@Param('produtoId', ParseIntPipe) produtoId: number) {
    return this.imgProductService.findByProduct(produtoId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.imgProductService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('imagem', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() imagem: Express.Multer.File,
    @CurrentUser() currentUser: UserPayload,
  ) {
    return this.imgProductService.update(id, currentUser.sub, imagem);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    return this.imgProductService.remove(id, currentUser.sub);
  }
}
