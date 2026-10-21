// testa as regras de usuário sem alterar no banco de dados de fato
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let prismaMock: {
    usuario: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const usuario = {
    id: 1,
    nome: 'Ana',
    username: 'ana',
    email: 'ana@example.com',
    createdAt: new Date('2026-10-20'),
    updatedAt: new Date('2026-10-20'),
  };

  const dadosCadastro = {
    nome: 'Ana',
    username: 'ana',
    email: 'ana@example.com',
    senha: 'senha123',
  };

  // monta um banco falso antes de cada teste.
  beforeEach(() => {
    prismaMock = {
      usuario: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new UserService(prismaMock as unknown as PrismaService);
  });

  // confere se a senha salva não fica em texto plano
  it('cria um usuário com a senha em hash', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    prismaMock.usuario.create.mockResolvedValue(usuario);

    await expect(service.create(dadosCadastro)).resolves.toEqual(usuario);

    const chamada = prismaMock.usuario.create.mock.calls[0][0];
    expect(chamada.data.senhaHash).not.toBe(dadosCadastro.senha);
    expect(
      await bcrypt.compare(dadosCadastro.senha, chamada.data.senhaHash),
    ).toBe(true);
    expect(chamada.select.senhaHash).toBeUndefined();
  });

  // impede duas contas com o mesmo e-mail
  it('recusa um e-mail já cadastrado', async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);

    await expect(service.create(dadosCadastro)).rejects.toThrow(
      ConflictException,
    );
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  // impede duas contas com o mesmo nome de usuário
  it('recusa um username já cadastrado', async () => {
    prismaMock.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(usuario);

    await expect(service.create(dadosCadastro)).rejects.toThrow(
      ConflictException,
    );
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  // devolve os dados quando o id existe
  it('encontra um usuário existente', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuario);

    await expect(service.findOne(1)).resolves.toEqual(usuario);
  });

  // devolve erro quando o id não foi encontrado
  it('avisa quando o usuário não existe', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  // deixa os outros campos fora da atualização
  it('atualiza apenas o campo enviado', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuario);
    prismaMock.usuario.update.mockResolvedValue({
      ...usuario,
      nome: 'Ana Maria',
    });

    await service.update(1, { nome: 'Ana Maria' });

    expect(prismaMock.usuario.update.mock.calls[0][0].data).toEqual({
      nome: 'Ana Maria',
    });
  });

  // gera outro hash quando a senha muda
  it('transforma a nova senha em hash na atualização', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuario);
    prismaMock.usuario.update.mockResolvedValue(usuario);

    await service.update(1, { senha: 'novaSenha123' });

    const data = prismaMock.usuario.update.mock.calls[0][0].data;
    expect(data.senhaHash).not.toBe('novaSenha123');
    expect(await bcrypt.compare('novaSenha123', data.senhaHash)).toBe(true);
  });

  // não deixa usar um nome de usuário que já pertence a outra conta
  it('recusa username pertencente a outro usuário na atualização', async () => {
    prismaMock.usuario.findUnique
      .mockResolvedValueOnce(usuario)
      .mockResolvedValueOnce({ ...usuario, id: 2 });

    await expect(service.update(1, { username: 'ocupado' })).rejects.toThrow(
      ConflictException,
    );
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  // não deixa usar um e-mail que já pertence a outra conta
  it('recusa e-mail pertencente a outro usuário na atualização', async () => {
    prismaMock.usuario.findUnique
      .mockResolvedValueOnce(usuario)
      .mockResolvedValueOnce({ ...usuario, id: 2 });

    await expect(
      service.update(1, { email: 'ocupado@example.com' }),
    ).rejects.toThrow(ConflictException);
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  // remove a conta quando o id existe
  it('exclui um usuário existente', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuario);
    prismaMock.usuario.delete.mockResolvedValue(usuario);

    await expect(service.remove(1)).resolves.toEqual(usuario);
    expect(prismaMock.usuario.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  // evita a exclusão quando o id não existe
  it('não tenta excluir um usuário inexistente', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    expect(prismaMock.usuario.delete).not.toHaveBeenCalled();
  });
});
