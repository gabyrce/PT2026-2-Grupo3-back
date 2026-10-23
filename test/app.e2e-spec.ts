// testa o acesso a rota inicial da aplicação
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Rota inicial', () => {
  let app: INestApplication;

  // inicia a aplicação uma vez para o teste
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  // fecha a aplicação quando o teste termina
  afterAll(async () => {
    await app.close();
  });

  // confirma que a rota inicial pede autenticação
  it('exige login para acessar /', async () => {
    await request(app.getHttpServer()).get('/').expect(401);
  });
});
