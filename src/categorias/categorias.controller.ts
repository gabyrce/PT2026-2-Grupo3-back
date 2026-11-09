import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import type { categoriadto } from './categoria.dto';
import { Public } from '../auth/decorators/isPublic.decorator';

@Public()
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post()
  create(@Body() data: categoriadto) {
    return this.categoriasService.create(data);
  }
  @Get()
  findAll() {
    return this.categoriasService.findAll();
  }
  @Put(':id')
  async update(@Param('id') id: number, @Body() data: categoriadto) {
    return this.categoriasService.update(Number(id), data);
  }
  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.categoriasService.delete(Number(id));
  }
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.categoriasService.findOne(Number(id));
  }

}