// src/auth/auth.service.ts

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

import { UserRepository } from '../users/user.repository';
import { SessionService } from '../sessions/session.service';
import { TokenService } from './token.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto) {
    /**
     * 1. Normalize email
     */
    const email = dto.email.trim().toLowerCase();

    /**
     * 2. Fast duplicate check.
     */
    const existingUser = await this.userRepo.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    /**
     * 3. Generate user id before creation.
     */
    const userId = `user:${randomUUID()}`;

    /**
     * 4. Reserve email atomically.
     */
    try {
      await this.userRepo.claimEmail(email, userId);
    } catch {
      throw new ConflictException('A user with this email already exists');
    }

    try {
      /**
       * 5. Hash password
       */
      const passwordHash = await bcrypt.hash(dto.password, 10);

      const now = new Date().toISOString();

      /**
       * 6. Create user document
       */
      const newUser = {
        _id: userId,

        type: 'user' as const,

        username: dto.username,

        email,

        passwordHash,

        status: 'pending_verification' as const,

        emailVerified: false,

        tenantId: null,

        createdAt: now,

        updatedAt: now,
      };

      const response = await this.userRepo.createUser(newUser);

      /**
       * Generate Verification Token
       */
      const verificationPayload: JwtPayload = {
        sub: response.id,
        sid: '',
        type: 'verification',
      };

      const verificationToken = this.tokenService.generateVerificationToken(verificationPayload);

      // TODO: Send verificationToken via EmailService

      return {
        success: true,
        id: response.id,
        verificationToken, // Returned for testing or immediate email dispatch
      };
    } catch (error) {
      /**
       * 7. Rollback email claim on error.
       */
      await this.userRepo.releaseEmailClaim(email);

      throw error;
    }
  }

  /**
   * Log in user, create a new session, and issue access & refresh tokens.
   */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async login(dto: LoginDto, meta?: { userAgent?: string; ipAddress?: string }) {
    const email = dto.email.trim().toLowerCase();

    // 1. Find user by email
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Ensure email is verified and user account is active
    if (user.status !== 'active' || !user.emailVerified) {
      throw new UnauthorizedException('Please verify your email address first.');
    }

    if (!user._id) {
      throw new InternalServerErrorException('User document is missing _id');
    }

    const userId: string = user._id;

    // 4. Set expiration for the refresh token & session (7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // 5. Generate FIXED Session ID upfront (یکبار برای همیشه)
    const sessionId = `session:${randomUUID()}`;

    // 6. Generate Refresh Token using the EXACT sessionId
    const refreshToken = this.tokenService.generateRefreshToken({
      sub: userId,
      sid: sessionId,
      type: 'refresh',
    });

    // 7. Hash the exact Refresh Token that will be returned to the client
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // 8. Create session in DB with the predetermined sessionId
    await this.sessionService.createSession(
      userId,
      refreshTokenHash,
      expiresAt,
      sessionId, // 👈 پاس دادن sessionId قطعی به SessionService
    );

    // 9. Generate Access Token
    const accessToken = this.tokenService.generateAccessToken({
      sub: userId,
      sid: sessionId,
      type: 'access',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: user.email,
        username: user.username,
      },
    };
  }

  /**
   * Verify user's email using the verification JWT token
   */
  async verifyEmail(token: string) {
    // ۱. اعتبارسنجی توکن JWT (افزودن await)
    let payload: JwtPayload;
    try {
      payload = await this.tokenService.verifyVerificationToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    // ۲. بررسی نوع توکن
    if (payload.type !== 'verification' || !payload.sub) {
      throw new UnauthorizedException('Invalid verification token payload');
    }

    const userId = payload.sub;

    // ۳. یافتن کاربر در دیتابیس
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // ۴. اگر حساب قبلاً تایید شده باشد
    if (user.emailVerified && user.status === 'active') {
      return {
        success: true,
        message: 'Email is already verified',
      };
    }

    // ۵. آپدیت وضعیت کاربر به active و emailVerified: true
    const now = new Date().toISOString();
    await this.userRepo.updateUser(userId, {
      ...user,
      emailVerified: true,
      status: 'active',
      updatedAt: now,
    });

    return {
      success: true,
      message: 'Email successfully verified. You can now log in.',
    };
  }

  /**
   * Refresh expired access token using a valid refresh token.
   */
  async refreshToken(refreshTokenStr: string) {
    // ۱. اعتبارسنجی اولیه ساختار JWT
    let payload: JwtPayload;
    try {
      payload = await this.tokenService.verifyRefreshToken(refreshTokenStr);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh' || !payload.sub || !payload.sid) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const userId = payload.sub;
    const sessionId = payload.sid;

    // ۲. دریافت نشست (Session) از دیتابیس
    const session = await this.sessionService.findSessionById(sessionId);
    if (!session || session.status !== 'active') {
      throw new UnauthorizedException('Session is inactive or revoked');
    }

    // ۳. بررسی انقضای تاریخ نشست
    if (new Date(session.expiresAt) < new Date()) {
      throw new UnauthorizedException('Session has expired');
    }

    // ۴. تطبیق توکن با هش ذخیره‌شده در دیتابیس (بررسی عدم جعل)
    const isTokenValid = await bcrypt.compare(refreshTokenStr, session.refreshTokenHash);
    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // ۵. صدور Access Token جدید
    const newAccessToken = this.tokenService.generateAccessToken({
      sub: userId,
      sid: sessionId,
      type: 'access',
    });

    return {
      accessToken: newAccessToken,
    };
  }

  /**
   * Log out user by revoking the active session.
   */
  async logout(sessionId: string) {
    if (!sessionId) {
      return { success: true };
    }

    // ابطال یا حذف Session در دیتابیس
    await this.sessionService.revokeSession(sessionId);

    return {
      success: true,
      message: 'Successfully logged out',
    };
  }
}
