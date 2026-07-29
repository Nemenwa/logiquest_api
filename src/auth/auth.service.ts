import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { OAuthProvider, OAuthProviderType } from './entities/oauth-provider.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { createHash } from 'node:crypto';

interface OAuthProfile {
  provider: string;
  providerUserId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OAuthProvider)
    private oauthProviderRepository: Repository<OAuthProvider>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private generateTokenPair(user: User) {
    const payload = { sub: user.id, username: user.username, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRY', '15m'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '7d'),
    });
    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d');
    const expiresAt = this.parseExpiry(refreshTokenExpiry);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId,
      tokenHash,
      expiresAt,
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);
  }

  private parseExpiry(expiry: string): Date {
    const now = new Date();
    const match = expiry.match(/^(\d+)([dhm])$/);
    
    if (!match) {
      // Default to 7 days if format is invalid
      now.setDate(now.getDate() + 7);
      return now;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      default:
        now.setDate(now.getDate() + 7);
    }

    return now;
  }

  async register(registerDto: RegisterDto) {
    const { username, email, password } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
    });
    await this.userRepository.save(user);

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokenPair(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  /**
   * Handle OAuth2 social login for both Google and GitHub.
   * - If a matching OAuthProvider record exists, return the linked user's tokens.
   * - If the OAuth email matches an existing account, link the provider and return tokens.
   * - Otherwise create a new user and link the provider.
   */
  async handleOAuthLogin(profile: OAuthProfile) {
    const providerType = profile.provider as OAuthProviderType;

    // 1. Check for existing OAuth provider link
    const existingProvider = await this.oauthProviderRepository.findOne({
      where: { provider: providerType, providerUserId: profile.providerUserId },
      relations: { user: true },
    });

    if (existingProvider) {
      // Sync profile data on every login
      existingProvider.displayName = profile.displayName;
      existingProvider.avatarUrl = profile.avatarUrl;
      await this.oauthProviderRepository.save(existingProvider);
      const tokens = this.generateTokenPair(existingProvider.user);
      await this.storeRefreshToken(existingProvider.user.id, tokens.refreshToken);
      return tokens;
    }

    // 2. Try to link to an existing account by email
    let user = profile.email
      ? await this.userRepository.findOne({ where: { email: profile.email } })
      : null;

    if (!user) {
      // 3. Create a new user — derive username from displayName or provider ID
      const baseUsername = (
        profile.displayName?.replace(/\s+/g, '').toLowerCase() ||
        `${profile.provider}_${profile.providerUserId}`
      ).slice(0, 30);

      const username = await this.ensureUniqueUsername(baseUsername);

      user = this.userRepository.create({
        username,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      });
      await this.userRepository.save(user);
    } else {
      // Sync profile data if missing
      if (!user.displayName) user.displayName = profile.displayName;
      if (!user.avatarUrl) user.avatarUrl = profile.avatarUrl;
      await this.userRepository.save(user);
    }

    // 4. Create the OAuthProvider link
    const oauthProvider = this.oauthProviderRepository.create({
      provider: providerType,
      providerUserId: profile.providerUserId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      userId: user.id,
    });
    await this.oauthProviderRepository.save(oauthProvider);

    const tokens = this.generateTokenPair(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  private async ensureUniqueUsername(base: string): Promise<string> {
    let candidate = base;
    let suffix = 1;
    while (await this.userRepository.findOne({ where: { username: candidate } })) {
      candidate = `${base}${suffix++}`;
    }
    return candidate;
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Revoke the old token
    storedToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(storedToken);

    // Get the user
    const user = await this.userRepository.findOne({
      where: { id: storedToken.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new tokens
    const newTokens = this.generateTokenPair(user);
    await this.storeRefreshToken(user.id, newTokens.refreshToken);

    return newTokens;
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    storedToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(storedToken);

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );

    return { message: 'Logged out from all devices successfully' };
  }
}