import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { lojasdto } from './lojas.dto';

@Injectable()
export class LojasService {
  
  constructor(private prisma: PrismaService) {}

  async create(data: lojasdto) {
    const loja = await this.prisma.lojas.create({
      data,
      include: {
        usuario: true,
        categoria: true,
        nome: true,
        descricao: true,
        logo_url: true,
        banner_url: true,
        sticker_url: true,
      }
    });
    return loja;
  }

  async findAll() {
    return await this.prisma.lojas.findMany({
      include: {
        usuario: true,
        categoria: true,
        nome: true,
        descricao: true,
        logo_url: true,
        banner_url: true,
        sticker_url: true,
      }
    });
  }

  async update(id: number, data: lojasdto) {
    const lojaexists = await this.prisma.lojas.findUnique({
      where: { id }
    });
    
    if (!lojaexists) {
      throw new Error('Loja não encontrada');
    }
    return await this.prisma.lojas.update({
      where: { id },
      data,
      include: {
        usuario: true,
        categoria: true,
        nome: true,
        descricao: true,
        logo_url: true,
        banner_url: true,
        sticker_url: true,
      }
    });
  }

  async delete(id: number) {
    const lojaexists = await this.prisma.lojas.findUnique({
      where: { id }
    });
    
    if (!lojaexists) {
      throw new Error('Loja não encontrada');
    }
    return await this.prisma.lojas.delete({
      where: { id }
    });
  }

  async findOne(id: number) {
    const lojaexists = await this.prisma.lojas.findUnique({
      where: { id },
      include: {
        usuario: true,
        categoria: true,
        nome: true,
        descricao: true,
        logo_url: true,
        banner_url: true,
        sticker_url: true,
      }
    });

    if (!lojaexists) {
      throw new Error('Loja não encontrada');
    }
    return lojaexists;
  }
}