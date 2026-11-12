import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { LojasService } from './lojas.service';
import type { lojasdto } from './lojas.dto';

@Controller('lojas')
export class LojasController {
  constructor(private readonly lojasService: LojasService) {}

  @Post()
  create(@Body() data: lojasdto) {
    return this.lojasService.create(data);
  }

  @Get()
  findAll() {
    return this.lojasService.findAll();
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
