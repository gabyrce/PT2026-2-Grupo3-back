import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { ProductService } from './product.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductService', () => {
  let service: ProductService;

  const prismaServiceMock = {
    produtos: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lojas: {
      findUnique: jest.fn(),
    },
    categorias: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar todos os produtos', async () => {
      const produtos = [{ id: 1, nome: 'Notebook' }];

      prismaServiceMock.produtos.findMany.mockResolvedValue(produtos);

      const resultado = await service.findAll();

      expect(resultado).toEqual(produtos);
      expect(prismaServiceMock.produtos.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve retornar um produto pelo ID', async () => {
      const produto = { id: 1, nome: 'Notebook' };

      prismaServiceMock.produtos.findUnique.mockResolvedValue(produto);

      const resultado = await service.findOne(1);

      expect(resultado).toEqual(produto);
      expect(prismaServiceMock.produtos.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { loja: true, categoria: true, imagens: true },
      });
    });

    it('deve lançar NotFoundException quando o produto não existir', async () => {
      prismaServiceMock.produtos.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      loja_id: 1,
      categoria_id: 1,
      nome: 'Notebook',
      descricao: 'Notebook para teste',
      preco: 3500,
      stock: 10,
    };

    it('deve cadastrar um produto', async () => {
      const loja = { id: 1, usuario_id: 10 };
      const categoria = { id: 1 };
      const produto = { id: 1, ...dto };

      prismaServiceMock.lojas.findUnique.mockResolvedValue(loja);
      prismaServiceMock.categorias.findUnique.mockResolvedValue(categoria);
      prismaServiceMock.produtos.create.mockResolvedValue(produto);

      const resultado = await service.create(dto, 10);

      expect(resultado).toEqual(produto);
      expect(prismaServiceMock.produtos.create).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException se a loja não existir', async () => {
      prismaServiceMock.lojas.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ForbiddenException se a loja pertencer a outro usuário', async () => {
      prismaServiceMock.lojas.findUnique.mockResolvedValue({
        id: 1,
        usuario_id: 20,
      });

      await expect(service.create(dto, 10)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar NotFoundException se a categoria não existir', async () => {
      prismaServiceMock.lojas.findUnique.mockResolvedValue({
        id: 1,
        usuario_id: 10,
      });
      prismaServiceMock.categorias.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar um produto do próprio usuário', async () => {
      const produto = {
        id: 1,
        loja: { usuario_id: 10 },
      };

      const dto = { nome: 'Notebook Atualizado' };

      prismaServiceMock.produtos.findUnique.mockResolvedValue(produto);
      prismaServiceMock.produtos.update.mockResolvedValue({
        id: 1,
        nome: 'Notebook Atualizado',
      });

      const resultado = await service.update(1, dto, 10);

      expect(resultado.nome).toBe('Notebook Atualizado');
      expect(prismaServiceMock.produtos.update).toHaveBeenCalled();
    });

    it('deve impedir a atualização de produto de outro usuário', async () => {
      prismaServiceMock.produtos.findUnique.mockResolvedValue({
        id: 1,
        loja: { usuario_id: 20 },
      });

      await expect(
        service.update(1, { nome: 'Alterado' }, 10),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaServiceMock.produtos.update).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundException se o produto não existir', async () => {
      prismaServiceMock.produtos.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, { nome: 'Alterado' }, 10),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deve excluir um produto do próprio usuário', async () => {
      prismaServiceMock.produtos.findUnique.mockResolvedValue({
        id: 1,
        loja: { usuario_id: 10 },
      });

      prismaServiceMock.produtos.delete.mockResolvedValue({ id: 1 });

      const resultado = await service.remove(1, 10);

      expect(resultado).toEqual({ id: 1 });
      expect(prismaServiceMock.produtos.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve impedir a exclusão de produto de outro usuário', async () => {
      prismaServiceMock.produtos.findUnique.mockResolvedValue({
        id: 1,
        loja: { usuario_id: 20 },
      });

      await expect(service.remove(1, 10)).rejects.toThrow(
        ForbiddenException,
      );

      expect(prismaServiceMock.produtos.delete).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundException se o produto não existir', async () => {
      prismaServiceMock.produtos.findUnique.mockResolvedValue(null);

      await expect(service.remove(999, 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
