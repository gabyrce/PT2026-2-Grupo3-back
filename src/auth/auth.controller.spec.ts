// testa se a rota de login repassa os dados ao service
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  // confere a chamada ao serviço e a resposta com o token
  it('envia os dados de login ao serviço', async () => {
    const authServiceMock = {
      login: jest.fn().mockResolvedValue({ access_token: 'token-teste' }),
    };

    const controller = new AuthController(
      authServiceMock as unknown as AuthService,
    );

    const dados = {
      email: 'ana@example.com',
      senha: 'senha123',
    };

    await expect(controller.login(dados)).resolves.toEqual({
      access_token: 'token-teste',
    });
    expect(authServiceMock.login).toHaveBeenCalledWith(dados);
  });
});
