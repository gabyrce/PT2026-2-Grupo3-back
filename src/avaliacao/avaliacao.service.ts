import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvaliacaoService {
  constructor(private readonly prisma: PrismaService) {}

  //Cria uma nova avaliação
  async criar(usuarioId: number, nota: number, texto: string) {
    return this.prisma.avaliacao.create({
      data: {
        usuarioId,
        nota,
        texto,
      },
      include: {
        usuario: { select: { id: true, nome: true } },
      },
    });
  }

  //Lista avaliações e calcula a média geral
  async buscarTodas() {
    const avaliacoes = await this.prisma.avaliacao.findMany({
      include: {
        usuario: { select: { id: true, nome: true } },
        comentarios: {
          include: { usuario: { select: { id: true, nome: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const somaNotas = avaliacoes.reduce((acc, item) => acc + item.nota, 0);
    const media = avaliacoes.length > 0 ? Number((somaNotas / avaliacoes.length).toFixed(2)) : 0;

    return {
      media,
      totalAvaliacoes: avaliacoes.length,
      avaliacoes,
    };
  }

  //Atualiza avaliação existente 
  async atualizar(id: number, nota?: number, texto?: string) {
    return this.prisma.avaliacao.update({
      where: { id },
      data: {
        ...(nota !== undefined && { nota }),
        ...(texto !== undefined && { texto }),
      },
    });
  }

  //Deleta avaliação
  async remover(id: number) {
    return this.prisma.avaliacao.delete({
      where: { id },
    });
  }

  //Adiciona comentário em uma avaliação
  async adicionarComentario(avaliacaoId: number, usuarioId: number, texto: string) {
    return this.prisma.comentario.create({
      data: {
        avaliacaoId,
        usuarioId,
        texto,
      },
      include: {
        usuario: { select: { id: true, nome: true } },
      },
    });
  }
}