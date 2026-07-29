import { Controller, Post, Body, Get, Req, UseGuards, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GithubOAuthGuard } from './guards/github-oauth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new player account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Account created — returns a JWT access token', schema: { example: { access_token: 'eyJ...' } } })
  @ApiResponse({ status: 400, description: 'Validation error or username/email already taken' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in with username and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Successful login — returns a JWT access token', schema: { example: { access_token: 'eyJ...' } } })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refreshTokens(refreshDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: Request, @Body() refreshDto: RefreshDto) {
    return this.authService.logout(refreshDto.refreshToken);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  logoutAll(@Req() req: Request) {
    return this.authService.logoutAll(req.user['sub']);
  }

  // ── Google OAuth2 ──────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth2 login flow — redirects to Google' })
  @ApiResponse({ status: 302, description: 'Redirect to Google authorization page' })
  googleAuth() {
    // Guard redirects to Google; nothing to return
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.handleOAuthLogin(req.user as any);
    return res.json(tokens);
  }

  // ── GitHub OAuth2 ──────────────────────────────────────────────────────────

  @Get('github')
  @UseGuards(GithubOAuthGuard)
  @ApiOperation({ summary: 'Initiate GitHub OAuth2 login flow — redirects to GitHub' })
  @ApiResponse({ status: 302, description: 'Redirect to GitHub authorization page' })
  githubAuth() {
    // Guard redirects to GitHub; nothing to return
  }

  @Get('github/callback')
  @UseGuards(GithubOAuthGuard)
  @ApiExcludeEndpoint()
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.handleOAuthLogin(req.user as any);
    return res.json(tokens);
  }
}
