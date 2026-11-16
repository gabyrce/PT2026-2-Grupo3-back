import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type TipoAvaliacao = 'loja' | 'produto';

const usuarioResumo = { select: { id: true, nome: true, username: true } };

@Injectable()
export class AvaliacaoService {
  constructor(private readonly prisma: PrismaService) {}

  private validarTipo(tipo: string): TipoAvaliacao {
    if (tipo !== 'loja' && tipo !== 'produto') {
      throw new BadRequestException('Tipo de avaliação deve ser "loja" ou "produto"');
    }
    return tipo;
  }

  private validarNota(nota: number) {
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      throw new BadRequestException('A nota deve ser um número inteiro de 1 a 5');
    }
  }

  // Cria uma nova avaliação para uma loja ou produto
  async criar(tipo: string, usuarioId: number, alvoId: number, nota: number, texto?: string) {
    const t = this.validarTipo(tipo);
    this.validarNota(nota);

    if (t === 'loja') {
      return this.prisma.avaliacaoLojas.create({
        data: { usuario_id: usuarioId, loja_id: alvoId, nota, comentario: texto },
        include: { usuario: usuarioResumo },
      });
    }
    return this.prisma.avaliacaoProdutos.create({
      data: { usuario_id: usuarioId, produto_id: alvoId, nota, comentario: texto },
      include: { usuario: usuarioResumo },
    });
  }

  // Lista avaliações (opcionalmente de uma loja/produto específico) e calcula a média
  async buscarTodas(tipo: string, alvoId?: number) {
    const t = this.validarTipo(tipo);
    const include = {
      usuario: usuarioResumo,
      comentarios: {
        include: { usuario: usuarioResumo },
        orderBy: { createdAt: 'asc' as const },
      },
    };
    const orderBy = { createdAt: 'desc' as const };

    const avaliacoes =
      t === 'loja'
        ? await this.prisma.avaliacaoLojas.findMany({
            where: alvoId !== undefined ? { loja_id: alvoId } : undefined,
            include,
            orderBy,
          })
        : await this.prisma.avaliacaoProdutos.findMany({
            where: alvoId !== undefined ? { produto_id: alvoId } : undefined,
            include,
            orderBy,
          });

    const somaNotas = avaliacoes.reduce((acc, item) => acc + item.nota, 0);
    const media = avaliacoes.length > 0 ? Number((somaNotas / avaliacoes.length).toFixed(2)) : 0;

    return {
      media,
      totalAvaliacoes: avaliacoes.length,
      avaliacoes,
    };
  }

    async buscarPorUsuario(tipo: string, usuarioId: number) {
    const t = this.validarTipo(tipo);

    const include = {
      usuario: usuarioResumo,
      comentarios: {
        include: { usuario: usuarioResumo },
        orderBy: { createdAt: 'asc' as const },
      },
    };

    const orderBy = { createdAt: 'desc' as const };

    if (t === 'loja') {
      return this.prisma.avaliacaoLojas.findMany({
        where: { usuario_id: usuarioId },
        include,
        orderBy,
      });
    }

    return this.prisma.avaliacaoProdutos.findMany({
      where: { usuario_id: usuarioId },
      include,
      orderBy,
    });
  }

  // Atualiza avaliação existente
  async atualizar(tipo: string, id: number, nota?: number, texto?: string) {
    const t = this.validarTipo(tipo);
    if (nota !== undefined) this.validarNota(nota);
    await this.garantirExiste(t, id);

    const data = {
      ...(nota !== undefined && { nota }),
      ...(texto !== undefined && { comentario: texto }),
    };

    if (t === 'loja') {
      return this.prisma.avaliacaoLojas.update({ where: { id }, data });
    }
    return this.prisma.avaliacaoProdutos.update({ where: { id }, data });
  }

  // Deleta avaliação (e os comentários dela, já que o schema não tem cascade)
  async remover(tipo: string, id: number) {
    const t = this.validarTipo(tipo);
    await this.garantirExiste(t, id);

    if (t === 'loja') {
      const [, removida] = await this.prisma.$transaction([
        this.prisma.comentarios.deleteMany({ where: { avaliacao_loja_id: id } }),
        this.prisma.avaliacaoLojas.delete({ where: { id } }),
      ]);
      return removida;
    }
    const [, removida] = await this.prisma.$transaction([
      this.prisma.comentarios.deleteMany({ where: { avaliacao_prod_id: id } }),
      this.prisma.avaliacaoProdutos.delete({ where: { id } }),
    ]);
    return removida;
  }

  // Adiciona comentário em uma avaliação
  async adicionarComentario(tipo: string, avaliacaoId: number, usuarioId: number, texto: string) {
    const t = this.validarTipo(tipo);
    await this.garantirExiste(t, avaliacaoId);

    return this.prisma.comentarios.create({
      data: {
        usuario_id: usuarioId,
        conteudo: texto,
        ...(t === 'loja'
          ? { avaliacao_loja_id: avaliacaoId }
          : { avaliacao_prod_id: avaliacaoId }),
      },
      include: { usuario: usuarioResumo },
    });
  }

  private async garantirExiste(tipo: TipoAvaliacao, id: number) {
    const avaliacao =
      tipo === 'loja'
        ? await this.prisma.avaliacaoLojas.findUnique({ where: { id } })
        : await this.prisma.avaliacaoProdutos.findUnique({ where: { id } });

    if (!avaliacao) {
      throw new NotFoundException(`Avaliação de ${tipo} com id ${id} não encontrada`);
    }
  }
}
