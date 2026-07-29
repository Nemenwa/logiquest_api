import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

const mockUserRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockRefreshTokenRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn().mockReturnValue('signed-token'),
});

const mockConfigService = () => ({
  get: jest.fn((key: string, defaultValue?: string) => defaultValue || 'test-value'),
});

describe('AuthService - Refresh Token Rotation', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let refreshTokenRepo: ReturnType<typeof mockRefreshTokenRepo>;
  let jwtService: ReturnType<typeof mockJwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        { provide: getRepositoryToken(RefreshToken), useFactory: mockRefreshTokenRepo },
        { provide: JwtService, useFactory: mockJwtService },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
    jwtService = module.get(JwtService);
  });

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockRefreshToken = 'valid-refresh-token';
  const mockTokenHash = 'hashed-token-123';

  describe('refreshTokens - token rotation', () => {
    it('should rotate tokens successfully with valid refresh token', async () => {
      const storedToken = {
        id: 'rt-1',
        userId: mockUser.id,
        tokenHash: mockTokenHash,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        revokedAt: null,
      };

      refreshTokenRepo.findOne.mockResolvedValue(storedToken);
      userRepo.findOne.mockResolvedValue(mockUser);
      refreshTokenRepo.save.mockResolvedValue(storedToken);
      jwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshTokens(mockRefreshToken);

      expect(refreshTokenRepo.findOne).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
      });
      expect(storedToken.revokedAt).toBeTruthy();
      expect(refreshTokenRepo.save).toHaveBeenCalledWith(storedToken);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException with invalid refresh token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException with revoked refresh token', async () => {
      const revokedToken = {
        id: 'rt-1',
        userId: mockUser.id,
        tokenHash: mockTokenHash,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: new Date(),
      };

      refreshTokenRepo.findOne.mockResolvedValue(revokedToken);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'Refresh token has been revoked',
      );
    });

    it('should throw UnauthorizedException with expired refresh token', async () => {
      const expiredToken = {
        id: 'rt-1',
        userId: mockUser.id,
        tokenHash: mockTokenHash,
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
        revokedAt: null,
      };

      refreshTokenRepo.findOne.mockResolvedValue(expiredToken);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'Refresh token has expired',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const storedToken = {
        id: 'rt-1',
        userId: 'non-existent-user',
        tokenHash: mockTokenHash,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
      };

      refreshTokenRepo.findOne.mockResolvedValue(storedToken);
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('refreshTokens - reuse attack prevention', () => {
    it('should prevent reuse of a refresh token after rotation', async () => {
      const storedToken = {
        id: 'rt-1',
        userId: mockUser.id,
        tokenHash: mockTokenHash,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
      };

      // First use - should succeed
      refreshTokenRepo.findOne.mockResolvedValueOnce(storedToken);
      userRepo.findOne.mockResolvedValueOnce(mockUser);
      refreshTokenRepo.save.mockResolvedValueOnce(storedToken);

      await service.refreshTokens(mockRefreshToken);

      // Second use with same token - should fail because it's now revoked
      const revokedToken = { ...storedToken, revokedAt: new Date() };
      refreshTokenRepo.findOne.mockResolvedValueOnce(revokedToken);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'Refresh token has been revoked',
      );
    });
  });

  describe('logout - single device logout', () => {
    it('should revoke the specified refresh token', async () => {
      const storedToken = {
        id: 'rt-1',
        userId: mockUser.id,
        tokenHash: mockTokenHash,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
      };

      refreshTokenRepo.findOne.mockResolvedValue(storedToken);
      refreshTokenRepo.save.mockResolvedValue(storedToken);

      const result = await service.logout(mockRefreshToken);

      expect(refreshTokenRepo.findOne).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
      });
      expect(storedToken.revokedAt).toBeTruthy();
      expect(refreshTokenRepo.save).toHaveBeenCalledWith(storedToken);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should throw UnauthorizedException with invalid token during logout', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.logout('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.logout('invalid-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('logoutAll - logout from all devices', () => {
    it('should revoke all refresh tokens for a user', async () => {
      refreshTokenRepo.update.mockResolvedValue({ affected: 3 });

      const result = await service.logoutAll(mockUser.id);

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: mockUser.id, revokedAt: null },
        { revokedAt: expect.any(Date) },
      );
      expect(result).toEqual({ message: 'Logged out from all devices successfully' });
    });

    it('should handle case with no active tokens', async () => {
      refreshTokenRepo.update.mockResolvedValue({ affected: 0 });

      const result = await service.logoutAll(mockUser.id);

      expect(result).toEqual({ message: 'Logged out from all devices successfully' });
    });
  });

  describe('token storage and hashing', () => {
    it('should store refresh token with hash', async () => {
      const storedToken = {
        id: 'rt-1',
        userId: mockUser.id,
        tokenHash: mockTokenHash,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
      };

      refreshTokenRepo.create.mockReturnValue(storedToken);
      refreshTokenRepo.save.mockResolvedValue(storedToken);

      // Access private method through service
      await service['storeRefreshToken'](mockUser.id, mockRefreshToken);

      expect(refreshTokenRepo.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      });
      expect(refreshTokenRepo.save).toHaveBeenCalledWith(storedToken);
    });

    it('should hash tokens consistently', async () => {
      const hash1 = service['hashToken']('test-token');
      const hash2 = service['hashToken']('test-token');
      const hash3 = service['hashToken']('different-token');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('expiry parsing', () => {
    it('should parse days correctly', () => {
      const now = new Date();
      const result = service['parseExpiry']('7d');
      const expected = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      expect(result.getTime()).toBeCloseTo(expected.getTime(), -3);
    });

    it('should parse hours correctly', () => {
      const now = new Date();
      const result = service['parseExpiry']('24h');
      const expected = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      expect(result.getTime()).toBeCloseTo(expected.getTime(), -3);
    });

    it('should parse minutes correctly', () => {
      const now = new Date();
      const result = service['parseExpiry']('30m');
      const expected = new Date(now.getTime() + 30 * 60 * 1000);
      
      expect(result.getTime()).toBeCloseTo(expected.getTime(), -3);
    });

    it('should default to 7 days for invalid format', () => {
      const now = new Date();
      const result = service['parseExpiry']('invalid');
      const expected = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      expect(result.getTime()).toBeCloseTo(expected.getTime(), -3);
    });
  });
});
