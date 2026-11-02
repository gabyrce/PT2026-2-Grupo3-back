import { Body, Controller, Delete, Get, Param, Patch, Post, } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { UserPayload } from '../auth/types/UserPayload';
import { Public } from '../auth/decorators/isPublic.decorator';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Public()
  @Get()
  async findAll() {
    return this.productService.findAll();
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productService.findOne(Number(id));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    return this.productService.update(
      Number(id),
      updateProductDto,
      currentUser.sub,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserPayload,
  ) {
    return this.productService.remove(
      Number(id),
      currentUser.sub,
    );
  }

  @Post()
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    return this.productService.create(createProductDto, currentUser.sub);
  }
}