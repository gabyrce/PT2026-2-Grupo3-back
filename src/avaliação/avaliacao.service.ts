import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvaliacaoService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Criar uma nova avaliação (CREATE)
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

  // 2. Listar avaliações e calcular a média geral (READ)
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

  // 3. Atualizar avaliação existente (UPDATE)
  async atualizar(id: number, nota?: number, texto?: string) {
    return this.prisma.avaliacao.update({
      where: { id },
      data: {
        ...(nota !== undefined && { nota }),
        ...(texto !== undefined && { texto }),
      },
    });
  }

  // 4. Deletar avaliação (DELETE)
  async remover(id: number) {
    return this.prisma.avaliacao.delete({
      where: { id },
    });
  }

  // 5. Adicionar comentário em uma avaliação
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