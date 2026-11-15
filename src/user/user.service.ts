
// faz as operações de usuário no banco e protege a senha
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // verifica duplicidades, gera o hash da senha e cria a conta
  async create(dto: CreateUserDto) {
    const email_existente = await this.prisma.usuario.findUnique({ //verifica se tem email cadastrado
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
  // altera os campos enviados e gera um novo hash se a senha mudar
  async update(
    id: number,
    dados: { nome?: string; username?: string; email?: string; senha?: string; profile_picture_url?: string; },
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
      senhaHash?: string;
      profile_picture_url?: string;
    } = {};

    if (dados.nome !== undefined) data.nome = dados.nome;
    if (dados.username !== undefined) data.username = dados.username;
    if (dados.email !== undefined) data.email = dados.email;

    if (dados.profile_picture_url !== undefined) {
      data.profile_picture_url = dados.profile_picture_url;
    }
    if (dados.senha !== undefined) {
      data.senhaHash = await bcrypt.hash(dados.senha, 10);
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

  // exclui a conta depois de confirmar que ela existe
  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.usuario.delete({
      where: { id },
      select: {
        id: true,
        nome: true,
        username: true,
        email: true,
        profile_picture_url: true,
      },
    });
  }

  // busca o cadastro pelo e-mail para conferir o login
  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }
}
