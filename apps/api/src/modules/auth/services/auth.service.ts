import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { User, Tenant } from '../entities';
import { JwtService } from './jwt.service';
import { EmailService } from './email.service';
import { RegisterDto } from '../dto/register.dto';
import {
  LoginRequest,
  LoginResponse,
  UserRole,
  UserStatus,
  AuthProvider,
} from '@app/shared';
import { ValidationUtils } from '@app/shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Register a new user and tenant
   */
  async register(
    registerDto: RegisterDto
  ): Promise<{ message: string; userId: string; tenantId: string }> {
    // Validate email format
    const emailValidation = ValidationUtils.validateAndSanitizeEmail(
      registerDto.email
    );
    if (!emailValidation.isValid) {
      throw new BadRequestException('Invalid email format');
    }

    const sanitizedEmail = registerDto.email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if tenant name already exists
    const existingTenant = await this.tenantRepository.findOne({
      where: { name: registerDto.tenantName },
    });

    if (existingTenant) {
      throw new ConflictException('Tenant with this name already exists');
    }

    // Create tenant
    const tenant = this.tenantRepository.create({
      name: registerDto.tenantName,
      domain: registerDto.domain ?? '',
      description: registerDto.description ?? '',
      contactEmail: registerDto.contactEmail ?? sanitizedEmail,
      contactPhone: registerDto.contactPhone ?? '',
      address: registerDto.address ?? '',
      city: registerDto.city ?? '',
      state: registerDto.state ?? '',
      postalCode: registerDto.postalCode ?? '',
      country: registerDto.country ?? '',
      timezone: registerDto.timezone ?? 'UTC',
      locale: registerDto.locale ?? 'en-US',
      currency: registerDto.currency ?? 'USD',
      plan: 'free',
      maxUsers: 5, // Free plan limit
      features: ['basic_auth', 'email_notifications'],
      settings: {
        emailVerificationRequired: true,
        allowRegistration: true,
      },
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    // Create user
    const user = this.userRepository.create({
      email: sanitizedEmail,
      password: registerDto.password,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      tenantId: savedTenant.id,
      role: UserRole.OWNER, // First user is owner
      status: UserStatus.PENDING, // Requires email verification
      authProvider: AuthProvider.LOCAL,
      preferences: {
        marketingConsent: registerDto.marketingConsent || false,
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      },
    });

    // Generate email verification token
    user.generateEmailVerificationToken();

    const savedUser = await this.userRepository.save(user);

    // Send email verification
    await this.emailService.sendEmailVerification(user);

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      userId: savedUser.id,
      tenantId: savedTenant.id,
    };
  }

  /**
   * Login user
   */
  async login(
    loginDto: LoginRequest,
    ipAddress?: string
  ): Promise<LoginResponse> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      if (user.status === UserStatus.PENDING) {
        throw new UnauthorizedException(
          'Please verify your email address before logging in'
        );
      }
      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException(
          'Your account has been suspended. Please contact support.'
        );
      }
      throw new UnauthorizedException('Account is not active');
    }

    // Check if tenant is active
    if (!user.tenant?.isActive) {
      throw new UnauthorizedException(
        'Your organization account is not active'
      );
    }

    // Update last login
    user.updateLastLogin(ipAddress);
    await this.userRepository.save(user);

    // Generate tokens
    const tokenPair = this.jwtService.generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
        ...(user.avatar && { avatar: user.avatar }),
        ...(user.lastLoginAt && { lastLoginAt: user.lastLoginAt }),
      },
    };
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (!user.isEmailVerificationTokenValid()) {
      throw new BadRequestException('Verification token has expired');
    }

    // Mark email as verified
    user.markEmailAsVerified();
    await this.userRepository.save(user);

    return {
      message:
        'Email verified successfully. You can now log in to your account.',
    };
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return {
        message:
          'If an account with this email exists, a verification email has been sent.',
      };
    }

    if (user.emailVerified) {
      return {
        message: 'Email is already verified.',
      };
    }

    // Generate new verification token
    user.generateEmailVerificationToken();
    await this.userRepository.save(user);

    // Send verification email
    await this.emailService.sendEmailVerification(user);

    return {
      message: 'Verification email sent successfully.',
    };
  }

  /**
   * Forgot password
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return {
        message:
          'If an account with this email exists, a password reset email has been sent.',
      };
    }

    // Generate password reset token
    user.generatePasswordResetToken();
    await this.userRepository.save(user);

    // Send password reset email
    await this.emailService.sendPasswordReset(user);

    return {
      message: 'Password reset email sent successfully.',
    };
  }

  /**
   * Reset password
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    if (!user.isPasswordResetTokenValid()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Validate new password
    const passwordValidation = ValidationUtils.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        passwordValidation.errors[0]?.message || 'Invalid password'
      );
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiresAt = null;
    await this.userRepository.save(user);

    return {
      message: 'Password reset successfully.',
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshToken: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const payload = this.jwtService.verifyRefreshToken(refreshToken);

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.jwtService.refreshAccessToken(refreshToken, {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId: string): Promise<{ message: string }> {
    // In a real implementation, you would add the refresh token to a blacklist
    // or use Redis to track invalidated tokens
    return {
      message: 'Logged out successfully.',
    };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user.toJSON();
  }
}
