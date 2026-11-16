import { Module } from '@nestjs/common';
import { ImgProductService } from './img_product.service';
import { ImgProductController } from './img_product.controller';

@Module({
  controllers: [ImgProductController],
  providers: [ImgProductService],
})
export class ImgProductModule {}
