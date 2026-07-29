import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { OAuthProvider, OAuthProviderType } from './entities/oauth-provider.entity';

const mockUserRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockOAuthRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn().mockReturnValue('signed-token'),
});

const mockConfigService = () => ({
  get: jest.fn().mockReturnValue('test-value'),
});

describe('AuthService - OAuth2 Social Login', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let oauthRepo: ReturnType<typeof mockOAuthRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        { provide: getRepositoryToken(OAuthProvider), useFactory: mockOAuthRepo },
        { provide: JwtService, useFactory: mockJwtService },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    oauthRepo = module.get(getRepositoryToken(OAuthProvider));
  });

  const googleProfile = {
    provider: 'google',
    providerUserId: 'google-123',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  describe('handleOAuthLogin - new user creation', () => {
    it('creates a new user and oauth provider link when none exist', async () => {
      oauthRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      const savedUser = { id: 'user-1', username: 'testuser', email: 'test@example.com' };
      userRepo.create.mockReturnValue(savedUser);
      userRepo.save.mockResolvedValue(savedUser);
      const savedOAuth = { id: 'oauth-1', ...googleProfile, userId: 'user-1' };
      oauthRepo.create.mockReturnValue(savedOAuth);
      oauthRepo.save.mockResolvedValue(savedOAuth);

      const result = await service.handleOAuthLogin(googleProfile);

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: googleProfile.email }),
      );
      expect(oauthRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: OAuthProviderType.GOOGLE,
          providerUserId: googleProfile.providerUserId,
        }),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('handleOAuthLogin - account linking', () => {
    it('links OAuth provider to existing account with matching email', async () => {
      oauthRepo.findOne.mockResolvedValue(null);
      const existingUser = { id: 'user-2', username: 'existing', email: 'test@example.com', save: jest.fn() };
      userRepo.findOne.mockResolvedValue(existingUser);
      userRepo.save.mockResolvedValue(existingUser);
      oauthRepo.create.mockReturnValue({});
      oauthRepo.save.mockResolvedValue({});

      const result = await service.handleOAuthLogin(googleProfile);

      expect(userRepo.create).not.toHaveBeenCalled();
      expect(oauthRepo.create).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('handleOAuthLogin - returning user', () => {
    it('returns tokens for a user with an existing provider link', async () => {
      const linkedUser = { id: 'user-3', username: 'linked', email: 'test@example.com' };
      const existingProvider = {
        provider: OAuthProviderType.GOOGLE,
        providerUserId: 'google-123',
        user: linkedUser,
        displayName: 'Old Name',
        avatarUrl: 'old-avatar',
      };
      oauthRepo.findOne.mockResolvedValue(existingProvider);
      oauthRepo.save.mockResolvedValue(existingProvider);

      const result = await service.handleOAuthLogin(googleProfile);

      expect(userRepo.create).not.toHaveBeenCalled();
      expect(oauthRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });
});