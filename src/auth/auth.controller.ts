// src/auth/auth.controller.ts

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard, AuthenticatedUser } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * ------------------------------------------------------------------------
   * Register User
   * POST /auth/register
   * ------------------------------------------------------------------------
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  /**
   * ------------------------------------------------------------------------
   * Verify Email Address
   * GET /auth/verify-email?token=...
   * ------------------------------------------------------------------------
   */
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    return await this.authService.verifyEmail(token);
  }

  /**
   * ------------------------------------------------------------------------
   * Log In User
   * POST /auth/login
   * ------------------------------------------------------------------------
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    return await this.authService.login(dto, { userAgent, ipAddress });
  }

  /**
   * ------------------------------------------------------------------------
   * Get Current Authenticated User Profile
   * GET /auth/me
   * ------------------------------------------------------------------------
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getProfile(@Req() req: Request & { user: AuthenticatedUser }) {
    return req.user;
  }

  /**
   * ------------------------------------------------------------------------
   * Refresh Access Token
   * POST /auth/refresh
   * ------------------------------------------------------------------------
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return await this.authService.refreshToken(dto.refreshToken); // نام متد AuthService خود را چک کنید
  }
  /**
   * ------------------------------------------------------------------------
   * Logout User
   * POST /auth/logout
   * ------------------------------------------------------------------------
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: LogoutDto) {
    return await this.authService.logout(dto.sessionId);
  }
}
