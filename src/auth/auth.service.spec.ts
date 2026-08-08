jest.mock('uuid', () => ({
  v7: () => 'mocked-uuid-v7-string',
}));
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { UserRepository } from '../users/user.repository';
import { SessionService } from '../sessions/session.service';
import { TokenService } from './token.service';
import { AuthCodeRepository } from './auth-code.repository';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepo: UserRepository;
  let authCodeRepo: AuthCodeRepository;
  let sessionService: SessionService;
  let tokenService: TokenService;

  /**
   * Fake UserRepository implementation.
   *
   * We mock infrastructure operations so
   * these tests only validate AuthService logic.
   */
  const mockUserRepository = {
    findByEmail: jest.fn(),
    claimEmail: jest.fn(),
    createUser: jest.fn(),
    releaseEmailClaim: jest.fn(),
  };

  const mockAuthCodeRepository = {
    saveAuthCode: jest.fn(),
    findByCode: jest.fn(),
    markUsed: jest.fn(),
  };

  beforeEach(async () => {
    const mockSessionService = {
      createSession: jest.fn(),
      findSessionById: jest.fn(),
      revokeSession: jest.fn(),
    };
    const mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      generateVerificationToken: jest.fn().mockReturnValue('mock-verification-token'),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      verifyVerificationToken: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: AuthCodeRepository,
          useValue: mockAuthCodeRepository,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userRepo = module.get<UserRepository>(UserRepository);
    authCodeRepo = module.get<AuthCodeRepository>(AuthCodeRepository);
    sessionService = module.get<SessionService>(SessionService);
    tokenService = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // register()
  // ─────────────────────────────────────────────────────────────────────────

  describe('register', () => {
    /**
     * Test:
     * Existing user should return 409.
     *
     * Flow:
     * findByEmail()
     *      |
     *      v
     * existing user found
     *      |
     *      v
     * ConflictException
     */
    it('should throw ConflictException (409) if email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
        _id: 'existing_user_id',
        email: 'test@example.com',
      });

      const dto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      await expect(authService.register(dto)).rejects.toThrow(ConflictException);

      expect(userRepo.claimEmail).not.toHaveBeenCalled();

      expect(userRepo.createUser).not.toHaveBeenCalled();
    });

    /**
     * Test:
     * Should create user successfully.
     *
     * Flow:
     *
     * findByEmail()
     *      |
     *      v
     * claimEmail()
     *      |
     *      v
     * createUser()
     *      |
     *      v
     * returns { success, id, verificationToken }
     */
    it('should successfully create a new user and return verificationToken', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      mockUserRepository.claimEmail.mockResolvedValue(undefined);

      mockUserRepository.createUser.mockResolvedValue({
        id: 'new_uuid_123',
        rev: '1-abc',
      });

      const dto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      };

      const result = await authService.register(dto);

      expect(result).toEqual({
        success: true,
        id: 'new_uuid_123',
        verificationToken: 'mock-verification-token',
      });

      expect(userRepo.claimEmail).toHaveBeenCalledWith('new@example.com', expect.any(String));

      expect(userRepo.createUser).toHaveBeenCalled();
    });

    /**
     * Test:
     * Email should be normalized.
     *
     * Input:
     * " Saeed@Example.COM "
     *
     * Expected:
     * "saeed@example.com"
     */
    it('should normalize email before checking and saving', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      mockUserRepository.claimEmail.mockResolvedValue(undefined);

      mockUserRepository.createUser.mockResolvedValue({
        id: 'new_uuid_456',
        rev: '1-def',
      });

      const dto = {
        email: '  Saeed@Example.COM  ',
        password: 'password123',
      };

      await authService.register(dto);

      expect(userRepo.findByEmail).toHaveBeenCalledWith('saeed@example.com');

      expect(userRepo.claimEmail).toHaveBeenCalledWith('saeed@example.com', expect.any(String));

      expect(userRepo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'saeed@example.com',
        }),
      );
    });

    /**
     * Test:
     * Username is optional.
     */
    it('should register successfully without username', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      mockUserRepository.claimEmail.mockResolvedValue(undefined);

      mockUserRepository.createUser.mockResolvedValue({
        id: 'new_uuid_789',
        rev: '1-ghi',
      });

      const dto = {
        email: 'new@example.com',
        password: 'password123',
      };

      const result = await authService.register(dto);

      expect(result).toMatchObject({
        success: true,
        id: 'new_uuid_789',
      });

      expect(userRepo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
        }),
      );
    });

    /**
     * Test:
     * Race condition protection.
     *
     * Two users register the same email.
     * CouchDB email claim document
     * rejects the second request.
     */
    it('should throw ConflictException when email claim fails', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      mockUserRepository.claimEmail.mockRejectedValue(new Error('conflict'));

      const dto = {
        email: 'duplicate@example.com',
        password: 'password123',
      };

      await expect(authService.register(dto)).rejects.toThrow(ConflictException);

      expect(userRepo.createUser).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // generateAuthorizationCode()
  // ─────────────────────────────────────────────────────────────────────────

  describe('generateAuthorizationCode', () => {
    /**
     * Test:
     * Should return a non-empty hex string code.
     */
    it('should return a non-empty string code', async () => {
      mockAuthCodeRepository.saveAuthCode.mockResolvedValue({
        id: 'auth_code:test-id',
        rev: '1-abc',
      });

      const code = await authService.generateAuthorizationCode('user:123', 'client-app');

      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });

    /**
     * Test:
     * Should persist the auth code document with correct fields.
     */
    it('should save auth_code document with correct type, userId, clientId and used=false', async () => {
      mockAuthCodeRepository.saveAuthCode.mockResolvedValue({
        id: 'auth_code:test-id',
        rev: '1-abc',
      });

      const userId = 'user:abc-123';
      const clientId = 'my-client';

      await authService.generateAuthorizationCode(userId, clientId);

      expect(authCodeRepo.saveAuthCode).toHaveBeenCalledWith(
        expect.stringMatching(/^auth_code:/),
        expect.objectContaining({
          type: 'auth_code',
          userId,
          clientId,
          used: false,
        }),
      );
    });

    /**
     * Test:
     * expiresAt must be ~60 seconds in the future.
     */
    it('should set expiresAt to approximately 60 seconds in the future', async () => {
      mockAuthCodeRepository.saveAuthCode.mockResolvedValue({
        id: 'auth_code:test-id',
        rev: '1-abc',
      });

      const before = Date.now();

      await authService.generateAuthorizationCode('user:123', 'client-app');

      const after = Date.now();

      const [[, savedData]] = (mockAuthCodeRepository.saveAuthCode as jest.Mock).mock.calls;
      const expiresAt = new Date(savedData.expiresAt as string).getTime();

      // expiresAt should be 60 000ms ahead, with some tolerance for test execution time
      expect(expiresAt).toBeGreaterThanOrEqual(before + 59_000);
      expect(expiresAt).toBeLessThanOrEqual(after + 61_000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // validateRefreshTokenCookie()
  // ─────────────────────────────────────────────────────────────────────────

  describe('validateRefreshTokenCookie', () => {
    const VALID_COOKIE = 'valid-refresh-token';

    /**
     * Test:
     * Returns userId when token is valid and session is active.
     */
    it('should return userId when cookie is valid and session is active', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockResolvedValue({
        sub: 'user:abc',
        sid: 'session:xyz',
        type: 'refresh',
      });

      (sessionService.findSessionById as jest.Mock).mockResolvedValue({
        _id: 'session:xyz',
        status: 'active',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });

      const result = await authService.validateRefreshTokenCookie(VALID_COOKIE);

      expect(result).toBe('user:abc');
    });

    /**
     * Test:
     * Returns null when verifyRefreshToken throws (expired / tampered token).
     */
    it('should return null when token verification fails', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockRejectedValue(
        new UnauthorizedException('Invalid token'),
      );

      const result = await authService.validateRefreshTokenCookie('bad-token');

      expect(result).toBeNull();
    });

    /**
     * Test:
     * Returns null when session does not exist.
     */
    it('should return null when session is not found', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockResolvedValue({
        sub: 'user:abc',
        sid: 'session:xyz',
        type: 'refresh',
      });

      (sessionService.findSessionById as jest.Mock).mockResolvedValue(null);

      const result = await authService.validateRefreshTokenCookie(VALID_COOKIE);

      expect(result).toBeNull();
    });

    /**
     * Test:
     * Returns null when session status is revoked.
     */
    it('should return null when session is revoked', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockResolvedValue({
        sub: 'user:abc',
        sid: 'session:xyz',
        type: 'refresh',
      });

      (sessionService.findSessionById as jest.Mock).mockResolvedValue({
        _id: 'session:xyz',
        status: 'revoked',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });

      const result = await authService.validateRefreshTokenCookie(VALID_COOKIE);

      expect(result).toBeNull();
    });

    /**
     * Test:
     * Returns null when session is past its expiresAt.
     */
    it('should return null when session has expired', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockResolvedValue({
        sub: 'user:abc',
        sid: 'session:xyz',
        type: 'refresh',
      });

      (sessionService.findSessionById as jest.Mock).mockResolvedValue({
        _id: 'session:xyz',
        status: 'active',
        expiresAt: new Date(Date.now() - 1_000).toISOString(), // already expired
      });

      const result = await authService.validateRefreshTokenCookie(VALID_COOKIE);

      expect(result).toBeNull();
    });
  });
});
