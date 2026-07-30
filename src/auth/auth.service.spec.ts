import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { UserRepository } from '../users/user.repository';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepo: UserRepository;

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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);

    userRepo = module.get<UserRepository>(UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
     */
    it('should successfully create a new user', async () => {
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

      expect(result).toEqual({
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
});
