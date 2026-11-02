import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { categoriadto } from './categoria.dto';

@Injectable()
export class CategoriasService {

  constructor(private prisma: PrismaService) {}

  async create(data: categoriadto) {
    const categoria = await this.prisma.categorias.create({
      data,
      include: {
        categoriaPrincipal: true,
        subCategoria: true,
      }
    });
    return categoria;
  }

  async findAll() {
    return await this.prisma.categorias.findMany({
      include: {
        categoriaPrincipal: true,
        subCategoria: true,
      }
    });
  }

  async update(id: number, data: categoriadto) {
    const categoriaexists = await this.prisma.categorias.findUnique({
      where: { id }
    });
    
    if (!categoriaexists) {
      throw new Error('Categoria não encontrada');
    }
    return await this.prisma.categorias.update({
      where: { id },
      data,
      include: {
        categoriaPrincipal: true,
        subCategoria: true,
      }
    });
  }

  async delete(id: number) {
    const categoriaexists = await this.prisma.categorias.findUnique({
      where: { id }
    });
    
    if (!categoriaexists) {
      throw new Error('Categoria não encontrada');
    }
    return await this.prisma.categorias.delete({
      where: { id }
    });
  }

  async findOne(id: number) {
    const categoriaexists = await this.prisma.categorias.findUnique({
      where: { id },
      include: {
        categoriaPrincipal: true,
        subCategoria: true,
        produto: true,
      }
    });
    
    if (!categoriaexists) {
      throw new Error('Categoria não encontrada');
    }
    return categoriaexists;
  }
}