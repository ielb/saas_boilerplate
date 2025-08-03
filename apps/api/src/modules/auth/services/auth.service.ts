import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';

import { User, Tenant } from '../entities';
import { JwtService } from './jwt.service';
import { RefreshTokenService } from './refresh-token.service';
import { MfaService } from './mfa.service';
import { EmailService } from './email.service';
import { LoginDto, RegisterDto } from '../dto';
import {
  LoginResponse,
  LoginRequest,
  AuthProvider,
  UserStatus,
} from '@app/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly mfaService: MfaService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<LoginResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Get or create default tenant
    let tenant = await this.tenantRepository.findOne({
      where: { name: 'Default Tenant' },
    });

    if (!tenant) {
      tenant = this.tenantRepository.create({
        name: 'Default Tenant',
        domain: 'default',
      });
      await this.tenantRepository.save(tenant);
    }

    // Create user
    const user = this.userRepository.create({
      email: registerDto.email,
      password: registerDto.password,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      tenantId: tenant.id,
      authProvider: AuthProvider.LOCAL,
    });

    await user.hashPassword();
    await this.userRepository.save(user);

    // Send email verification
    await this.emailService.sendEmailVerification(user);

    // Generate tokens
    const accessToken = this.jwtService.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    const refreshTokenEntity =
      await this.refreshTokenService.createRefreshToken(user, {});
    const refreshToken = this.jwtService.generateRefreshToken(
      user.id,
      refreshTokenEntity.tokenId
    );
    const tokenHash = this.refreshTokenService.hashToken(refreshToken);
    await this.refreshTokenService.updateTokenHash(
      refreshTokenEntity.tokenId,
      tokenHash
    );

    // Calculate expiration time
    const expiresIn = this.jwtService.getTokenExpiration(accessToken)?.getTime()
      ? Math.floor(
          (this.jwtService.getTokenExpiration(accessToken)!.getTime() -
            Date.now()) /
            1000
        )
      : 0;

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
        ...(user.avatar && { avatar: user.avatar }),
      },
    };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto, ipAddress?: string): Promise<LoginResponse> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    user.updateLastLogin(ipAddress);
    await this.userRepository.save(user);

    // Generate tokens
    const accessToken = this.jwtService.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    const refreshTokenEntity =
      await this.refreshTokenService.createRefreshToken(user, {
        ...(ipAddress && { ipAddress }),
      });

    const refreshToken = this.jwtService.generateRefreshToken(
      user.id,
      refreshTokenEntity.tokenId
    );
    const tokenHash = this.refreshTokenService.hashToken(refreshToken);
    await this.refreshTokenService.updateTokenHash(
      refreshTokenEntity.tokenId,
      tokenHash
    );

    // Calculate expiration time
    const expiresIn = this.jwtService.getTokenExpiration(accessToken)?.getTime()
      ? Math.floor(
          (this.jwtService.getTokenExpiration(accessToken)!.getTime() -
            Date.now()) /
            1000
        )
      : 0;

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
        ...(user.avatar && { avatar: user.avatar }),
      },
    };
  }

  /**
   * Verify MFA and complete login
   */
  async verifyMfaAndCompleteLogin(
    userId: string,
    token: string
  ): Promise<LoginResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Check if user has exceeded attempt limits
    if (this.mfaService.hasExceededAttempts(user)) {
      throw new UnauthorizedException(
        'Too many failed attempts. Please try again later.'
      );
    }

    // Verify MFA token
    const isValid = await this.mfaService.verifyTwoFactorAuth(user, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Reset attempt counter
    await this.mfaService.resetAttempts(user);

    // Generate tokens
    const accessToken = this.jwtService.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    const refreshTokenEntity =
      await this.refreshTokenService.createRefreshToken(user, {});
    const refreshToken = this.jwtService.generateRefreshToken(
      user.id,
      refreshTokenEntity.tokenId
    );
    const tokenHash = this.refreshTokenService.hashToken(refreshToken);
    await this.refreshTokenService.updateTokenHash(
      refreshTokenEntity.tokenId,
      tokenHash
    );

    // Calculate expiration time
    const expiresIn = this.jwtService.getTokenExpiration(accessToken)?.getTime()
      ? Math.floor(
          (this.jwtService.getTokenExpiration(accessToken)!.getTime() -
            Date.now()) /
            1000
        )
      : 0;

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
        ...(user.avatar && { avatar: user.avatar }),
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshToken: string,
    ipAddress?: string
  ): Promise<LoginResponse> {
    const payload = this.jwtService.decodeToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Validate refresh token
    const isValid =
      await this.refreshTokenService.validateRefreshToken(refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate refresh token
    const { newToken: newRefreshTokenEntity } =
      await this.refreshTokenService.rotateRefreshToken(refreshToken, user, {
        ...(ipAddress && { ipAddress }),
      });

    // Generate new refresh token JWT
    const newRefreshToken = this.jwtService.generateRefreshToken(
      user.id,
      newRefreshTokenEntity.tokenId
    );
    const tokenHash = this.refreshTokenService.hashToken(newRefreshToken);
    await this.refreshTokenService.updateTokenHash(
      newRefreshTokenEntity.tokenId,
      tokenHash
    );

    // Generate new access token
    const accessToken = this.jwtService.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    // Calculate expiration time
    const expiresIn = this.jwtService.getTokenExpiration(accessToken)?.getTime()
      ? Math.floor(
          (this.jwtService.getTokenExpiration(accessToken)!.getTime() -
            Date.now()) /
            1000
        )
      : 0;

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
        ...(user.avatar && { avatar: user.avatar }),
      },
    };
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<void> {
    const payload = this.jwtService.decodeToken(refreshToken);
    if (payload) {
      await this.refreshTokenService.revokeRefreshToken(payload.tokenId);
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (!user.isEmailVerificationTokenValid()) {
      throw new BadRequestException('Verification token has expired');
    }

    user.markEmailAsVerified();
    await this.userRepository.save(user);
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    user.generateEmailVerificationToken();
    await this.userRepository.save(user);
    await this.emailService.sendEmailVerification(user);
  }

  /**
   * Forgot password
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    this.logger.log(`Password reset requested for email: ${email}`);

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists for security
      this.logger.warn(
        `Password reset attempted for non-existent email: ${email}`
      );
      return {
        message: 'Password reset email sent',
      };
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`Password reset attempted for inactive user: ${email}`);
      return {
        message: 'Password reset email sent',
      };
    }

    // Generate new reset token
    user.generatePasswordResetToken();
    await this.userRepository.save(user);

    try {
      await this.emailService.sendPasswordReset(user);
      this.logger.log(`Password reset email sent successfully to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to: ${email}`,
        error instanceof Error ? error.stack : String(error)
      );
      // Clear the token if email fails
      user.passwordResetToken = null;
      user.passwordResetTokenExpiresAt = null;
      await this.userRepository.save(user);
      throw new BadRequestException('Failed to send password reset email');
    }

    return {
      message: 'Password reset email sent',
    };
  }

  /**
   * Reset password
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string; status: string }> {
    this.logger.log(
      `Password reset attempt with token: ${token.substring(0, 8)}...`
    );

    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user) {
      this.logger.warn(
        `Invalid password reset token attempted: ${token.substring(0, 8)}...`
      );
      throw new BadRequestException('Invalid reset token');
    }

    if (!user.isPasswordResetTokenValid()) {
      this.logger.warn(
        `Expired password reset token attempted for user: ${user.email}`
      );
      throw new BadRequestException('Reset token has expired');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(
        `Password reset attempted for inactive user: ${user.email}`
      );
      throw new BadRequestException('Account is not active');
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiresAt = null;
    await user.hashPassword();
    await this.userRepository.save(user);

    this.logger.log(`Password reset successful for user: ${user.email}`);

    return {
      message: 'Password reset successfully',
      status: 'success',
    };
  }
}
