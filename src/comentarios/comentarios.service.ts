import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { comentariosdto } from './comentarios.dto';

@Injectable()
export class ComentariosService {

  constructor(private prisma: PrismaService) {}

  async create(data: comentariosdto) {
    const comentario = await this.prisma.comentarios.create({
      data,
      include: {
        usuario: true,
        avaliacaoLoja: true,
        avaliacaoProduto: true
      }
    });
    return comentario;
  }
  
  async findAll() {
    return await this.prisma.comentarios.findMany({
      include: {
        usuario: true,
        avaliacaoLoja: true,
        avaliacaoProduto: true
      }
    });
  }

  async update(id: number, data: comentariosdto) {
    const comentarioexists = await this.prisma.comentarios.findUnique({
      where: { id }
    });
    
    if (!comentarioexists) {
      throw new Error('Comentário não encontrado');
    }
    return await this.prisma.comentarios.update({
      where: { id },
      data,
      include: {
        usuario: true,
        avaliacaoLoja: true,
        avaliacaoProduto: true
      }
    });
  }

  async delete(id: number) {
    const comentarioexists = await this.prisma.comentarios.findUnique({
      where: { id }
    });
    
    if (!comentarioexists) {
      throw new Error('Comentário não encontrado');
    }
    return await this.prisma.comentarios.delete({
      where: { id }
    });
  }

  async findOne(id: number) {
    const comentarioexists = await this.prisma.comentarios.findUnique({
      where: { id },
      include: {
        usuario: true,
        avaliacaoLoja: true,
        avaliacaoProd: true
      }
    });

    if (!comentarioexists) {
      throw new Error('Comentário não encontrado');
    }
    return comentarioexists;
  }

}
