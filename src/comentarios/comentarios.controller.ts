import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { ComentariosService } from './comentarios.service';
import type { comentariosdto } from './comentarios.dto';

@Controller('comentarios')
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Post()
  create(@Body() data: comentariosdto) {
    return this.comentariosService.create(data);
  }

  @Get()
  findAll() {
    return this.comentariosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.comentariosService.findOne(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() data: comentariosdto) {
    return this.comentariosService.update(Number(id), data);
  }

  @Delete(':id')
  delete(@Param('id') id: number) {
    return this.comentariosService.delete(Number(id));
  }
}