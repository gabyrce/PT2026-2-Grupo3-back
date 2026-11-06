import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { AvaliacaoService } from './avaliacao.service';

@Controller('avaliacao')
export class AvaliacaoController {
  constructor(private readonly avaliacaoService: AvaliacaoService) {}

  // POST (Criar Avaliação)
  @Post()
  criar(@Body() body: { usuarioId: number; nota: number; texto: string }) {
    return this.avaliacaoService.criar(body.usuarioId, body.nota, body.texto);
  }

  // GET /avaliacao (Listar Avaliações com média)
  @Get()
  buscarTodas() {
    return this.avaliacaoService.buscarTodas();
  }

  // PATCH (Atualizar Avaliação)
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body() body: { nota?: number; texto?: string },
  ) {
    return this.avaliacaoService.atualizar(+id, body.nota, body.texto);
  }

  // DELETE (Remover Avaliação)
  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.avaliacaoService.remover(+id);
  }

  // POST (Comentar em uma Avaliação)
  @Post(':id/comentario')
  adicionarComentario(
    @Param('id') id: string,
    @Body() body: { usuarioId: number; texto: string },
  ) {
    return this.avaliacaoService.adicionarComentario(+id, body.usuarioId, body.texto);
  }
}