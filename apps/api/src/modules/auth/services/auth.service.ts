import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
import * as argon2 from 'argon2';

import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities';
import { JwtService } from './jwt.service';
import { RefreshTokenService } from './refresh-token.service';
import { MfaService } from './mfa.service';
import { EmailService } from '../../email/services/email.service';
import { SessionService } from './session.service';
import { RoleService } from '../../rbac/services/role.service';
import { PermissionService } from '../../rbac/services/permission.service';
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
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly mfaService: MfaService,
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService
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

    // Create tenant from registration data
    // Check if tenant with this name already exists (excluding soft-deleted)
    let tenant = await this.tenantRepository.findOne({
      where: { name: registerDto.tenantName, deletedAt: IsNull() },
    });

    if (tenant) {
      throw new BadRequestException(
        `Tenant with name "${registerDto.tenantName}" already exists`
      );
    }

    // Check for domain uniqueness if provided (excluding soft-deleted)
    if (registerDto.domain) {
      const existingTenantByDomain = await this.tenantRepository.findOne({
        where: { domain: registerDto.domain, deletedAt: IsNull() },
      });

      if (existingTenantByDomain) {
        throw new BadRequestException(
          `Tenant with domain "${registerDto.domain}" already exists`
        );
      }
    }

    // Create new tenant with error handling for constraint violations
    tenant = this.tenantRepository.create({
      name: registerDto.tenantName,
      ...(registerDto.domain && { domain: registerDto.domain }),
      ...(registerDto.description && { description: registerDto.description }),
      ...(registerDto.contactEmail && { contactEmail: registerDto.contactEmail }),
      ...(registerDto.contactPhone && { contactPhone: registerDto.contactPhone }),
      ...(registerDto.address && { address: registerDto.address }),
      ...(registerDto.city && { city: registerDto.city }),
      ...(registerDto.state && { state: registerDto.state }),
      ...(registerDto.postalCode && { postalCode: registerDto.postalCode }),
      ...(registerDto.country && { country: registerDto.country }),
      ...(registerDto.timezone && { timezone: registerDto.timezone }),
      ...(registerDto.locale && { locale: registerDto.locale }),
      ...(registerDto.currency && { currency: registerDto.currency }),
      isActive: true,
      plan: 'free',
    });

    try {
      tenant = await this.tenantRepository.save(tenant);
    } catch (error: any) {
      // Handle database constraint violations (unique key violations)
      if (error.code === '23505') {
        // PostgreSQL unique violation error code
        this.logger.error(
          `Tenant creation failed due to unique constraint: ${error.constraint || 'unknown'}. Message: ${error.message}`
        );
        
        // Check constraint name or error message to determine which field caused the violation
        const constraintName = error.constraint || '';
        const errorMessage = error.message || '';
        
        if (
          constraintName.includes('name') ||
          constraintName.includes('IDX_tenants_name') ||
          errorMessage.toLowerCase().includes('name')
        ) {
          throw new BadRequestException(
            `Tenant with name "${registerDto.tenantName}" already exists. Please choose a different name.`
          );
        } else if (
          constraintName.includes('domain') ||
          constraintName.includes('IDX_tenants_domain') ||
          errorMessage.toLowerCase().includes('domain')
        ) {
          throw new BadRequestException(
            `Tenant with domain "${registerDto.domain}" already exists. Please choose a different domain.`
          );
        } else {
          // Generic error for any unique constraint violation
          throw new BadRequestException(
            'A tenant with this name or domain already exists. Please choose a different name or domain.'
          );
        }
      }
      // Re-throw other errors
      this.logger.error(`Error creating tenant: ${error.message}`, error.stack);
      throw error;
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

    // Set tenant context for role and permission creation
    // This is needed because these services use tenant-scoped repositories
    const previousTenantId = (global as any).__currentTenantId;
    (global as any).__currentTenantId = tenant.id;

    try {
      // Create default permissions first (permissions are global, not tenant-scoped)
      // Permissions must exist before we can assign them to roles
      const createdPermissions = await this.permissionService.createDefaultPermissions();
      
      if (createdPermissions.length === 0) {
        this.logger.warn('No permissions were created or found. This may cause role assignment to fail.');
      } else {
        this.logger.log(`Successfully created/found ${createdPermissions.length} permissions`);
      }
      
      // Small delay to ensure permissions are committed to database
      // This helps avoid foreign key constraint violations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create default roles for the tenant (roles are tenant-scoped)
      // Roles will automatically assign permissions via assignDefaultPermissionsToRole
      await this.roleService.createDefaultRoles();

      // Ensure Super Admin has all permissions
      await this.roleService.updateSuperAdminPermissions();
    } finally {
      // Restore previous tenant context or clear it
      if (previousTenantId) {
        (global as any).__currentTenantId = previousTenantId;
      } else {
        delete (global as any).__currentTenantId;
      }
    }

    // Assign "Member" role to the new user
    const memberRole = await this.roleService.getRoleByName('Member');
    if (memberRole) {
      await this.roleService.assignRoleToUser(user.id, {
        roleId: memberRole.id,
      });
      this.logger.log(`Assigned Member role to user: ${user.email}`);
    } else {
      this.logger.warn(`Member role not found for tenant: ${tenant.id}`);
    }

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
  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
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

    // Create session for this login
    const deviceFingerprint = this.sessionService.generateDeviceFingerprint(
      userAgent || '',
      ipAddress || ''
    );

    const browserInfo = userAgent
      ? this.sessionService.parseBrowserInfo(userAgent)
      : { browser: 'Unknown', browserVersion: 'Unknown' };

    const osInfo = userAgent
      ? this.sessionService.parseOperatingSystem(userAgent)
      : { operatingSystem: 'Unknown', osVersion: 'Unknown' };

    const deviceType = userAgent
      ? this.sessionService.detectDeviceType(userAgent)
      : ('unknown' as any);

    const session = await this.sessionService.createSession({
      userId: user.id,
      refreshTokenHash: tokenHash,
      deviceFingerprint,
      deviceName: `${browserInfo.browser} on ${osInfo.operatingSystem}`,
      deviceType,
      browser: browserInfo.browser,
      browserVersion: browserInfo.browserVersion,
      operatingSystem: osInfo.operatingSystem,
      osVersion: osInfo.osVersion,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || '',
      isRememberMe: loginDto.rememberMe || false,
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
  async logout(refreshToken: string, userId?: string): Promise<void> {
    const payload = this.jwtService.decodeToken(refreshToken);
    if (payload) {
      await this.refreshTokenService.revokeRefreshToken(payload.tokenId);
    }

    // If userId is provided, revoke the current session
    if (userId) {
      // Find and revoke the session associated with this refresh token
      const sessions = await this.sessionService.getUserSessions(userId);
      const currentSession = sessions.find(
        session =>
          session.refreshTokenHash ===
          this.refreshTokenService.hashToken(refreshToken)
      );

      if (currentSession) {
        await this.sessionService.revokeSession(currentSession.id, {
          reason: 'User logout',
        });
      }
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

  /**
   * Validate reset token
   * Checks if a password reset token is valid without resetting the password
   */
  async validateResetToken(token: string): Promise<{ valid: boolean; message: string }> {
    this.logger.log(
      `Validating reset token: ${token.substring(0, 8)}...`
    );

    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user) {
      this.logger.warn(
        `Invalid password reset token validation attempted: ${token.substring(0, 8)}...`
      );
      return {
        valid: false,
        message: 'Invalid reset token',
      };
    }

    if (!user.isPasswordResetTokenValid()) {
      this.logger.warn(
        `Expired password reset token validation attempted for user: ${user.email}`
      );
      return {
        valid: false,
        message: 'Reset token has expired',
      };
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(
        `Reset token validation attempted for inactive user: ${user.email}`
      );
      return {
        valid: false,
        message: 'Account is not active',
      };
    }

    this.logger.log(`Reset token is valid for user: ${user.email}`);

    return {
      valid: true,
      message: 'Reset token is valid',
    };
  }
}
