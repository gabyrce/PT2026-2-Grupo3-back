// testa a verificação da senha e a criação do token no login
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let userServiceMock: { findByEmail: jest.Mock };
  let jwtServiceMock: { signAsync: jest.Mock };

  // monta os serviços falsos usados em cada teste
  beforeEach(() => {
    userServiceMock = { findByEmail: jest.fn() };
    jwtServiceMock = { signAsync: jest.fn() };

    const configServiceMock = {
      get: jest.fn().mockReturnValue('chave-apenas-para-teste'),
    };

    service = new AuthService(
      userServiceMock as unknown as UserService,
      jwtServiceMock as unknown as JwtService,
      configServiceMock as unknown as ConfigService,
    );
  });

  // recusa o login quando não há cadastro para o e-mail
  it('recusa e-mail que não existe', async () => {
    userServiceMock.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'ninguem@example.com',
        senha: 'senha123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

    // recusa o login quando a senha está incorreta
  it('recusa senha incorreta', async () => {
    const senhaHash = await bcrypt.hash('senha-correta', 10);

    userServiceMock.findByEmail.mockResolvedValue({
      id: 1,
      email: 'ana@example.com',
      senhaHash,
    });

    await expect(
      service.login({
        email: 'ana@example.com',
        senha: 'senha-errada',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  // devolve um token quando a senha confere
  it('gera token quando e-mail e senha estão corretos', async () => {
    const senhaHash = await bcrypt.hash('senha123', 10);

    userServiceMock.findByEmail.mockResolvedValue({
      id: 1,
      email: 'ana@example.com',
      senhaHash,
    });
    jwtServiceMock.signAsync.mockResolvedValue('token-teste');

    await expect(
      service.login({
        email: 'ana@example.com',
        senha: 'senha123',
      }),
    ).resolves.toEqual({ access_token: 'token-teste' });

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
      { sub: 1, email: 'ana@example.com' },
      expect.objectContaining({ secret: 'chave-apenas-para-teste' }),
    );
  });
});
