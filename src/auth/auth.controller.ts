// src/auth/auth.controller.ts

import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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
}
