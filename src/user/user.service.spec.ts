
// testa as regras de usuário sem alterar no banco de dados de fato

import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';

type MockModel = {
  findMany: jest.Mock;
  deleteMany: jest.Mock;
  delete: jest.Mock;
};

describe('UserService', () => {
  let service: UserService;
  let txMock: {
    avaliacaoLojas: MockModel;
    avaliacaoProdutos: MockModel;
    comentarios: MockModel;
    imagensProduto: MockModel;
    produtos: MockModel;
    lojas: MockModel;
    novaSenha: MockModel;
    usuario: MockModel;
  };

  let prismaMock: {
    usuario: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
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
    const criarMockModel = (): MockModel => ({
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      delete: jest.fn().mockResolvedValue(usuario),
    });

    txMock = {
      avaliacaoLojas: criarMockModel(),
      avaliacaoProdutos: criarMockModel(),
      comentarios: criarMockModel(),
      imagensProduto: criarMockModel(),
      produtos: criarMockModel(),
      lojas: criarMockModel(),
      novaSenha: criarMockModel(),
      usuario: criarMockModel(),
    };

    prismaMock = {
      usuario: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof txMock) => Promise<unknown>) =>
        callback(txMock),
    );

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

  // exclui a conta quando a senha atual está correta
  it('exclui a conta após validar a senha atual', async () => {
    const senhaHash = await bcrypt.hash('senhaCorreta123', 10);

    prismaMock.usuario.findUnique.mockResolvedValue({
      id: 1,
      senhaHash,
      profile_picture_url: null,
      lojas: [],
    });

    await expect(
      service.deleteAccount(1, 'senhaCorreta123'),
    ).resolves.toEqual({ message: 'Conta excluída com sucesso.' });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.comentarios.deleteMany).toHaveBeenCalled();
    expect(txMock.avaliacaoLojas.deleteMany).toHaveBeenCalled();
    expect(txMock.avaliacaoProdutos.deleteMany).toHaveBeenCalled();
    expect(txMock.imagensProduto.deleteMany).toHaveBeenCalled();
    expect(txMock.produtos.deleteMany).toHaveBeenCalled();
    expect(txMock.lojas.deleteMany).toHaveBeenCalled();
    expect(txMock.novaSenha.deleteMany).toHaveBeenCalled();
    expect(txMock.usuario.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  // impede a exclusão quando a senha atual está incorreta
  it('recusa exclusão com senha atual incorreta', async () => {
    const senhaHash = await bcrypt.hash('senhaCorreta123', 10);

    prismaMock.usuario.findUnique.mockResolvedValue({
      id: 1,
      senhaHash,
      profile_picture_url: null,
      lojas: [],
    });

    await expect(
      service.deleteAccount(1, 'senhaErrada123'),
    ).rejects.toThrow(UnauthorizedException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // evita a exclusão quando o usuário não existe
  it('não tenta excluir um usuário inexistente', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.deleteAccount(999, 'senha123'),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // altera a senha quando a senha atual está correta
  it('altera a senha após validar a senha atual', async () => {
    const senhaHash = await bcrypt.hash('senhaAtual123', 10);

    prismaMock.usuario.findUnique.mockResolvedValue({
      id: 1,
      senhaHash,
    });
    prismaMock.usuario.update.mockResolvedValue(usuario);

    await expect(
      service.changePassword(1, 'senhaAtual123', 'novaSenha123'),
    ).resolves.toEqual({ message: 'Senha alterada com sucesso.' });

    const data = prismaMock.usuario.update.mock.calls[0][0].data;

    expect(await bcrypt.compare('novaSenha123', data.senhaHash)).toBe(true);
  });

  // rejeita a alteração quando a senha atual está incorreta
  it('recusa alteração com senha atual incorreta', async () => {
    const senhaHash = await bcrypt.hash('senhaCorreta123', 10);

    prismaMock.usuario.findUnique.mockResolvedValue({
      id: 1,
      senhaHash,
    });

    await expect(
      service.changePassword(1, 'senhaErrada123', 'novaSenha123'),
    ).rejects.toThrow(UnauthorizedException);

    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  // rejeita a alteração quando o usuário não existe
  it('recusa alteração de senha para usuário inexistente', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.changePassword(999, 'senhaAtual123', 'novaSenha123'),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });
});
