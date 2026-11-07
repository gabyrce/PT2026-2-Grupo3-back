import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

describe('ProductController', () => {
  let controller: ProductController;

  const productServiceMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: productServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar todos os produtos', async () => {
      const produtos = [{ id: 1, nome: 'Notebook' }];
      productServiceMock.findAll.mockResolvedValue(produtos);

      const resultado = await controller.findAll();

      expect(resultado).toEqual(produtos);
      expect(productServiceMock.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve buscar um produto pelo ID', async () => {
      const produto = { id: 1, nome: 'Notebook' };
      productServiceMock.findOne.mockResolvedValue(produto);

      const resultado = await controller.findOne('1');

      expect(resultado).toEqual(produto);
      expect(productServiceMock.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('deve cadastrar um produto usando o ID do usuário autenticado', async () => {
      const dto = {
        loja_id: 1,
        categoria_id: 1,
        nome: 'Notebook',
        descricao: 'Notebook para teste',
        preco: 3500,
        stock: 10,
      };

      const usuario = { sub: 10 } as any;
      const produto = { id: 1, ...dto };

      productServiceMock.create.mockResolvedValue(produto);

      const resultado = await controller.create(dto, usuario);

      expect(resultado).toEqual(produto);
      expect(productServiceMock.create).toHaveBeenCalledWith(dto, 10);
    });
  });

  describe('update', () => {
    it('deve atualizar um produto usando o ID do usuário autenticado', async () => {
      const dto = { nome: 'Notebook Atualizado' };
      const usuario = { sub: 10 } as any;
      const produto = { id: 1, nome: 'Notebook Atualizado' };

      productServiceMock.update.mockResolvedValue(produto);

      const resultado = await controller.update('1', dto, usuario);

      expect(resultado).toEqual(produto);
      expect(productServiceMock.update).toHaveBeenCalledWith(1, dto, 10);
    });
  });

  describe('remove', () => {
    it('deve excluir um produto usando o ID do usuário autenticado', async () => {
      const usuario = { sub: 10 } as any;
      const produto = { id: 1, nome: 'Notebook' };

      productServiceMock.remove.mockResolvedValue(produto);

      const resultado = await controller.remove('1', usuario);

      expect(resultado).toEqual(produto);
      expect(productServiceMock.remove).toHaveBeenCalledWith(1, 10);
    });
  });
});
