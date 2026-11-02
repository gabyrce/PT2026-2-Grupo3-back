import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { categoriadto } from './categoria.dto';

@Injectable()
export class CategoriasService {

  constructor(private prisma: PrismaService) {}

  async create(data: categoriadto) {
    const categoria = await this.prisma.categoria.create({
      data
    });
    return categoria;
  }

  async findAll() {
    return await this.prisma.categoria.findMany();
  }

  async update(id: number, data: categoriadto) {
    const categoriaexists = await this.prisma.categoria.findUnique({
      where: { id }
    });
    
    if (!categoriaexists) {
      throw new Error('Categoria não encontrada');
    }
    return await this.prisma.categoria.update({
      where: { id },
      data
    });
  }

  async delete(id: number) {
    const categoriaexists = await this.prisma.categoria.findUnique({
      where: { id }
    });
    
    if (!categoriaexists) {
      throw new Error('Categoria não encontrada');
    }
    return await this.prisma.categoria.delete({
      where: { id }
    });
  }

  async findOne(id: number) {
    const categoriaexists = await this.prisma.categoria.findUnique({
      where: { id }
    });
    
    if (!categoriaexists) {
      throw new Error('Categoria não encontrada');
    }
    return categoriaexists;
  }
}
