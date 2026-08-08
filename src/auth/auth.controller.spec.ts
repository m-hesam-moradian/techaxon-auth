// src/auth/auth.controller.spec.ts

jest.mock('uuid', () => ({
  v7: () => 'mocked-uuid-v7-string',
}));

import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    verifyEmail: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    validateRefreshTokenCookie: jest.fn(),
    generateAuthorizationCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /auth/authorize
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /auth/authorize', () => {
    const queryDto = {
      client_id: 'test-client',
      redirect_uri: 'https://app.example.com/callback',
      state: 'random-state-string',
      response_type: 'code' as const,
    };

    /**
     * Test:
     * No cookie present → render login view with form context.
     */
    it('should render login view when no cookie is present', async () => {
      const mockReq = {
        cookies: {},
      } as unknown as Request;

      const mockRes = {
        redirect: jest.fn(),
        render: jest.fn(),
      } as unknown as Response;

      await controller.authorize(queryDto, mockReq, mockRes);

      expect(authService.validateRefreshTokenCookie).not.toHaveBeenCalled();
      expect(authService.generateAuthorizationCode).not.toHaveBeenCalled();
      expect(mockRes.render).toHaveBeenCalledWith('login', {
        client_id: queryDto.client_id,
        redirect_uri: queryDto.redirect_uri,
        state: queryDto.state,
      });
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    /**
     * Test:
     * Cookie present but invalid → render login view.
     */
    it('should render login view when cookie is present but invalid', async () => {
      const mockReq = {
        cookies: { techaxon_refresh_token: 'bad-token' },
      } as unknown as Request;

      const mockRes = {
        redirect: jest.fn(),
        render: jest.fn(),
      } as unknown as Response;

      mockAuthService.validateRefreshTokenCookie.mockResolvedValue(null);

      await controller.authorize(queryDto, mockReq, mockRes);

      expect(authService.validateRefreshTokenCookie).toHaveBeenCalledWith('bad-token');
      expect(authService.generateAuthorizationCode).not.toHaveBeenCalled();
      expect(mockRes.render).toHaveBeenCalledWith('login', {
        client_id: queryDto.client_id,
        redirect_uri: queryDto.redirect_uri,
        state: queryDto.state,
      });
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    /**
     * Test:
     * Cookie present and valid → generate auth code → 302 redirect.
     */
    it('should redirect with auth code when cookie is valid', async () => {
      const mockReq = {
        cookies: { techaxon_refresh_token: 'valid-refresh-token' },
      } as unknown as Request;

      const mockRes = {
        redirect: jest.fn(),
        render: jest.fn(),
      } as unknown as Response;

      mockAuthService.validateRefreshTokenCookie.mockResolvedValue('user:abc-123');
      mockAuthService.generateAuthorizationCode.mockResolvedValue('generated-auth-code-hex');

      await controller.authorize(queryDto, mockReq, mockRes);

      expect(authService.validateRefreshTokenCookie).toHaveBeenCalledWith('valid-refresh-token');
      expect(authService.generateAuthorizationCode).toHaveBeenCalledWith(
        'user:abc-123',
        queryDto.client_id,
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        302,
        `${queryDto.redirect_uri}?code=generated-auth-code-hex&state=${queryDto.state}`,
      );
      expect(mockRes.render).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /auth/login — cookie-setting
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /auth/login — SSO cookie', () => {
    /**
     * Test:
     * On a successful login the techaxon_refresh_token cookie is set
     * with the correct value and options.
     */
    it('should set techaxon_refresh_token cookie with correct options on login', async () => {
      const mockReq = {
        headers: { 'user-agent': 'jest-test-agent' },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const cookieMock = jest.fn();
      const mockRes = {
        cookie: cookieMock,
      } as unknown as Response;

      mockAuthService.login.mockResolvedValue({
        accessToken: 'access-jwt',
        refreshToken: 'raw-refresh-token',
        user: { id: 'user:123', email: 'test@example.com', username: 'tester' },
      });

      await controller.login(
        { email: 'test@example.com', password: 'pass123' },
        mockReq,
        mockRes,
      );

      expect(cookieMock).toHaveBeenCalledWith(
        'techaxon_refresh_token',
        'raw-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
    });
  });
});
