
// faz as operações de usuário no banco e protege a senha
import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { removeStoredProfileImage } from '../profile-image/image-storage';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  // verifica duplicidades, gera o hash da senha e cria a conta
  async create(dto: CreateUserDto) {
    const email_existente = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (email_existente) {
      throw new ConflictException('Este e-mail já está cadastrado.');
    }

    const username_existente = await this.prisma.usuario.findUnique({
      where: { username: dto.username },
    });

    if (username_existente) {
      throw new ConflictException('Este nome de usuário já está cadastrado.');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    return this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        username: dto.username,
        email: dto.email,
        senhaHash,
      },
      select: {
        id: true,
        nome: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // lista os usuários sem incluir o hash da senha
  async findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // busca um usuário pelo id e avisa quando ele não existe
  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        username: true,
        email: true,
        profile_picture_url: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return usuario;
  }

  // busca os dados públicos de um usuário
  async findPublicProfile(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        username: true,
        profile_picture_url: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return usuario;
  }

  // altera os campos enviados
  async update(
    id: number,
    dados: {
      nome?: string;
      username?: string;
      email?: string;
      profile_picture_url?: string;
    },
  ) {
    await this.findOne(id);

    if (dados.username !== undefined) {
      const usuarioComUsername = await this.prisma.usuario.findUnique({
        where: { username: dados.username },
      });

      if (usuarioComUsername && usuarioComUsername.id !== id) {
        throw new ConflictException('Este nome de usuário já está cadastrado.');
      }
    }

    if (dados.email !== undefined) {
      const usuarioComEmail = await this.prisma.usuario.findUnique({
        where: { email: dados.email },
      });

      if (usuarioComEmail && usuarioComEmail.id !== id) {
        throw new ConflictException('Este e-mail já está cadastrado.');
      }
    }

    const data: {
      nome?: string;
      username?: string;
      email?: string;
      profile_picture_url?: string;
    } = {};

    if (dados.nome !== undefined) data.nome = dados.nome;
    if (dados.username !== undefined) data.username = dados.username;
    if (dados.email !== undefined) data.email = dados.email;

    if (dados.profile_picture_url !== undefined) {
      data.profile_picture_url = dados.profile_picture_url;
    }

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nome: true,
        username: true,
        email: true,
        profile_picture_url: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // altera a senha somente após confirmar a senha atual
  async changePassword(
    id: number,
    senhaAtual: string,
    novaSenha: string,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        senhaHash: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const senhaValida = await bcrypt.compare(
      senhaAtual,
      usuario.senhaHash,
    );

    if (!senhaValida) {
      throw new UnauthorizedException('A senha atual está incorreta.');
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

    await this.prisma.usuario.update({
      where: { id },
      data: { senhaHash: novaSenhaHash },
    });

    return { message: 'Senha alterada com sucesso.' };
  }

  // exclui a conta após confirmar a senha atual
  async deleteAccount(id: number, senhaAtual: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        senhaHash: true,
        profile_picture_url: true,
        lojas: {
          select: {
            id: true,
            produtos: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const senhaValida = await bcrypt.compare(
      senhaAtual,
      usuario.senhaHash,
    );

    if (!senhaValida) {
      throw new UnauthorizedException('A senha atual está incorreta.');
    }

    const lojaIds = usuario.lojas.map((loja) => loja.id);

    const produtoIds = usuario.lojas.flatMap((loja) =>
      loja.produtos.map((produto) => produto.id),
    );

    await this.prisma.$transaction(async (tx) => {
      // identifica as avaliações escritas pelo usuário
      // e as avaliações vinculadas às lojas e produtos dele
      const avaliacoesLojas = await tx.avaliacaoLojas.findMany({
        where: {
          OR: [
            { usuario_id: id },
            { loja_id: { in: lojaIds } },
          ],
        },
        select: { id: true },
      });

      const avaliacoesProdutos = await tx.avaliacaoProdutos.findMany({
        where: {
          OR: [
            { usuario_id: id },
            { produto_id: { in: produtoIds } },
          ],
        },
        select: { id: true },
      });

      const avaliacaoLojaIds = avaliacoesLojas.map(
        (avaliacao) => avaliacao.id,
      );

      const avaliacaoProdutoIds = avaliacoesProdutos.map(
        (avaliacao) => avaliacao.id,
      );

      // exclui comentários do usuário e comentários
      // vinculados às avaliações que serão removidas
      await tx.comentarios.deleteMany({
        where: {
          OR: [
            { usuario_id: id },
            { avaliacao_loja_id: { in: avaliacaoLojaIds } },
            { avaliacao_prod_id: { in: avaliacaoProdutoIds } },
          ],
        },
      });

      // remove as avaliações identificadas
      await tx.avaliacaoLojas.deleteMany({
        where: {
          id: { in: avaliacaoLojaIds },
        },
      });

      await tx.avaliacaoProdutos.deleteMany({
        where: {
          id: { in: avaliacaoProdutoIds },
        },
      });

      // remove imagens e produtos das lojas do usuário
      await tx.imagensProduto.deleteMany({
        where: {
          produto_id: { in: produtoIds },
        },
      });

      await tx.produtos.deleteMany({
        where: {
          id: { in: produtoIds },
        },
      });

      // remove as lojas
      await tx.lojas.deleteMany({
        where: {
          id: { in: lojaIds },
        },
      });

      // remove códigos de recuperação de senha
      await tx.novaSenha.deleteMany({
        where: { usuario_id: id },
      });

      // por último, remove a conta
      await tx.usuario.delete({
        where: { id },
      });
    });

    // remove a foto somente depois que a transação foi concluída
    if (usuario.profile_picture_url) {
      try {
        await removeStoredProfileImage(usuario.profile_picture_url);
      } catch (error) {
        this.logger.error(
          'A conta foi excluída, mas não foi possível remover a foto de perfil.',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return { message: 'Conta excluída com sucesso.' };
  }

  // busca o cadastro pelo e-mail para conferir o login
  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }
}
