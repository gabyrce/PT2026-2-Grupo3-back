import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AvaliacaoService } from './avaliacao.service';

// :tipo = "loja" ou "produto"
@Controller('avaliacao/:tipo')
export class AvaliacaoController {
  constructor(private readonly avaliacaoService: AvaliacaoService) {}

  // POST /avaliacao/:tipo  (cria avaliação; alvoId = id da loja ou do produto)
  @Post()
  criar(
    @Param('tipo') tipo: string,
    @Body() body: { usuarioId: number; alvoId: number; nota: number; texto?: string },
  ) {
    return this.avaliacaoService.criar(tipo, body.usuarioId, body.alvoId, body.nota, body.texto);
  }

  // GET /avaliacao/:tipo?alvoId=1  (lista avaliações e média; alvoId opcional)
  @Get()
  buscarTodas(@Param('tipo') tipo: string, @Query('alvoId') alvoId?: string) {
    return this.avaliacaoService.buscarTodas(tipo, alvoId !== undefined ? +alvoId : undefined);
  }

  // PATCH /avaliacao/:tipo/:id  (atualiza)
  @Patch(':id')
  atualizar(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nota?: number; texto?: string },
  ) {
    return this.avaliacaoService.atualizar(tipo, id, body.nota, body.texto);
  }

  // DELETE /avaliacao/:tipo/:id
  @Delete(':id')
  remover(@Param('tipo') tipo: string, @Param('id', ParseIntPipe) id: number) {
    return this.avaliacaoService.remover(tipo, id);
  }

  // POST /avaliacao/:tipo/:id/comentario  (comenta em uma avaliação)
  @Post(':id/comentario')
  adicionarComentario(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { usuarioId: number; texto: string },
  ) {
    return this.avaliacaoService.adicionarComentario(tipo, id, body.usuarioId, body.texto);
  }
}
