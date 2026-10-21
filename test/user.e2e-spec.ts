// testa as rotas de usuário com o serviço e o login simulados
import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserController } from '../src/user/user.controller';
import { UserService } from '../src/user/user.service';
import { UserPayload } from '../src/auth/types/UserPayload';

describe('Endpoints de usuário', () => {
  let app: INestApplication;
  let userServiceMock: {
    create: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  // monta uma aplicação de teste antes de cada requisição
  beforeEach(async () => {
    userServiceMock = {
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: userServiceMock },
        {
          provide: APP_GUARD,
          useValue: {
            // identifica o usuário de teste em cada chamada
            canActivate(context: ExecutionContext) {
              const requisicao = context
                .switchToHttp()
                .getRequest<{ user?: UserPayload }>();

              requisicao.user = {
                sub: 2,
                email: 'outra.pessoa@example.com',
              };

              return true;
            },
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  // fecha a aplicação depois de cada teste
  afterEach(async () => {
    await app.close();
  });

  // valida o e-mail antes de chamar o serviço
  it('recusa cadastro com e-mail inválido', async () => {
    await request(app.getHttpServer())
      .post('/user')
      .send({
        nome: 'Teste',
        username: 'teste',
        email: 'email-invalido',
        senha: 'senha123',
      })
      .expect(400);

    expect(userServiceMock.create).not.toHaveBeenCalled();
  });

  // usa o id do login para buscar o próprio perfil
  it('mostra apenas o perfil da pessoa logada', async () => {
    userServiceMock.findOne.mockResolvedValue({
      id: 2,
      nome: 'Outra Pessoa',
      username: 'outra_pessoa',
      email: 'outra.pessoa@example.com',
    });

    const resposta = await request(app.getHttpServer())
      .get('/user/me')
      .expect(200);

    expect(resposta.body.id).toBe(2);
    expect(userServiceMock.findOne).toHaveBeenCalledWith(2);
  });

  // bloqueia a leitura de outra conta
  it('impede consultar outra conta', async () => {
    await request(app.getHttpServer()).get('/user/1').expect(401);
    expect(userServiceMock.findOne).not.toHaveBeenCalled();
  });

  // bloqueia a edição de outra conta
  it('impede alterar outra conta', async () => {
    await request(app.getHttpServer())
      .patch('/user/1')
      .send({ nome: 'Alteração indevida' })
      .expect(401);

    expect(userServiceMock.update).not.toHaveBeenCalled();
  });

  // bloqueia a exclusão de outra conta
  it('impede excluir outra conta', async () => {
    await request(app.getHttpServer()).delete('/user/1').expect(401);
    expect(userServiceMock.remove).not.toHaveBeenCalled();
  });

  // confirma que não existe rota para listar todos usuarios
  it('não oferece uma lista de todos os usuários', async () => {
    await request(app.getHttpServer()).get('/user').expect(404);
  });
});
