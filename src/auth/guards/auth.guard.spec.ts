import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtServiceMock: { verifyAsync: jest.Mock };
  let configServiceMock: { get: jest.Mock };
  let reflectorMock: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    jwtServiceMock = {
      verifyAsync: jest.fn(),
    };

    configServiceMock = {
      get: jest.fn().mockReturnValue('chave-apenas-para-teste'),
    };

    reflectorMock = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };

    guard = new AuthGuard(
      jwtServiceMock as unknown as JwtService,
      configServiceMock as unknown as ConfigService,
      reflectorMock as unknown as Reflector,
    );
  });

  function criarContexto(authorization?: string) {
    const request: {
      headers: { authorization?: string };
      user?: unknown;
    } = {
      headers: { authorization },
    };

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
      }),
    };

    return { context: context as unknown as ExecutionContext, request };
  }

  it('permite acesso a uma rota pública', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(true);

    const { context } = criarContexto();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtServiceMock.verifyAsync).not.toHaveBeenCalled();
  });

  it('recusa acesso sem token', async () => {
    const { context } = criarContexto();

    await expect(
      guard.canActivate(context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('recusa token inválido', async () => {
    jwtServiceMock.verifyAsync.mockRejectedValue(new Error('Token inválido'));

    const { context } = criarContexto('Bearer token-invalido');

    await expect(
      guard.canActivate(context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('permite acesso com token válido e associa o payload à requisição', async () => {
    const payload = {
      sub: 1,
      email: 'ana@example.com',
    };

    jwtServiceMock.verifyAsync.mockResolvedValue(payload);

    const { context, request } = criarContexto('Bearer token-valido');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith(
      'token-valido',
      { secret: 'chave-apenas-para-teste' },
    );

    expect(request.user).toEqual(payload);
  });
});
