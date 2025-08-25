import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { JwtService } from '../services/jwt.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { MfaService } from '../services/mfa.service';
import { EmailService } from '../../email/services/email.service';
import { LoginResponse, UserStatus, UserRole } from '@app/shared';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockLoginResponse: LoginResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    user: {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
      tenantId: 'tenant-123',
    },
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    tenantId: 'tenant-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            verifyEmail: jest.fn(),
            resendEmailVerification: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
            refreshToken: jest.fn(),
            verifyMfaAndCompleteLogin: jest.fn(),
            logout: jest.fn(),
            getProfile: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            generateAccessToken: jest.fn(),
            generateRefreshToken: jest.fn(),
            getTokenExpiration: jest.fn(),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            createRefreshToken: jest.fn(),
            hashToken: jest.fn(),
            updateTokenHash: jest.fn(),
          },
        },
        {
          provide: MfaService,
          useValue: {
            verifyTwoFactorAuth: jest.fn(),
            hasExceededAttempts: jest.fn(),
            resetAttempts: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmailVerification: jest.fn(),
            sendPasswordReset: jest.fn(),
          },
        },
        ThrottlerGuard,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const registerDto = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User',
        tenantName: 'Test Company',
        domain: 'testcompany.com',
        description: 'Test tenant',
        contactEmail: 'admin@testcompany.com',
        contactPhone: '+1234567890',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'US',
        timezone: 'America/New_York',
        locale: 'en-US',
        currency: 'USD',
        marketingConsent: true,
        acceptTerms: true,
      };

      const expectedResponse = {
        message: 'User and tenant created successfully',
        userId: 'user-123',
        tenantId: 'tenant-123',
      };

      jest
        .spyOn(authService, 'register')
        .mockResolvedValue(expectedResponse as any);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should handle registration with existing user', async () => {
      // Arrange
      const registerDto = {
        email: 'existing@example.com',
        password: 'SecurePassword123!',
        firstName: 'Existing',
        lastName: 'User',
        tenantName: 'Test Company',
        domain: 'testcompany.com',
        description: 'Test tenant',
        contactEmail: 'admin@testcompany.com',
        contactPhone: '+1234567890',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'US',
        timezone: 'America/New_York',
        locale: 'en-US',
        currency: 'USD',
        marketingConsent: true,
        acceptTerms: true,
      };

      jest
        .spyOn(authService, 'register')
        .mockRejectedValue(new BadRequestException('User already exists'));

      // Act & Assert
      await expect(controller.register(registerDto)).rejects.toThrow(
        BadRequestException
      );
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
      };

      const mockRequest = {
        ip: '192.168.1.1',
        connection: { remoteAddress: '192.168.1.1' },
        headers: { 'user-agent': 'test-user-agent' },
      } as any;

      jest.spyOn(authService, 'login').mockResolvedValue(mockLoginResponse);

      // Act
      const result = await controller.login(loginDto, mockRequest);

      // Assert
      expect(result).toEqual(mockLoginResponse);
      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        '192.168.1.1',
        'test-user-agent'
      );
    });

    it('should handle login with invalid credentials', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      const mockRequest = {
        ip: '192.168.1.1',
        connection: { remoteAddress: '192.168.1.1' },
        headers: { 'user-agent': 'test-user-agent' },
      } as any;

      jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      // Act & Assert
      await expect(controller.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        '192.168.1.1',
        'test-user-agent'
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      // Arrange
      const token = 'valid-email-verification-token';

      jest.spyOn(authService, 'verifyEmail').mockResolvedValue(undefined);

      // Act
      const result = await controller.verifyEmail(token);

      // Assert
      expect(result).toBeUndefined();
      expect(authService.verifyEmail).toHaveBeenCalledWith(token);
    });

    it('should handle invalid email verification token', async () => {
      // Arrange
      const token = 'invalid-token';

      jest
        .spyOn(authService, 'verifyEmail')
        .mockRejectedValue(
          new BadRequestException('Invalid verification token')
        );

      // Act & Assert
      await expect(controller.verifyEmail(token)).rejects.toThrow(
        BadRequestException
      );
      expect(authService.verifyEmail).toHaveBeenCalledWith(token);
    });
  });

  describe('resendEmailVerification', () => {
    it('should resend email verification successfully', async () => {
      // Arrange
      const email = 'test@example.com';

      jest
        .spyOn(authService, 'resendEmailVerification')
        .mockResolvedValue(undefined);

      // Act
      const result = await controller.resendEmailVerification(email);

      // Assert
      expect(result).toBeUndefined();
      expect(authService.resendEmailVerification).toHaveBeenCalledWith(email);
    });

    it('should handle resend email verification for non-existent user', async () => {
      // Arrange
      const email = 'nonexistent@example.com';

      jest
        .spyOn(authService, 'resendEmailVerification')
        .mockRejectedValue(new BadRequestException('User not found'));

      // Act & Assert
      await expect(controller.resendEmailVerification(email)).rejects.toThrow(
        BadRequestException
      );
      expect(authService.resendEmailVerification).toHaveBeenCalledWith(email);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email successfully', async () => {
      // Arrange
      const forgotPasswordDto = {
        email: 'test@example.com',
      };

      const expectedResponse = {
        message: 'Password reset email sent',
      };

      jest
        .spyOn(authService, 'forgotPassword')
        .mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.forgotPassword(forgotPasswordDto);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(authService.forgotPassword).toHaveBeenCalledWith(
        'test@example.com'
      );
    });

    it('should handle forgot password with invalid email', async () => {
      // Arrange
      const forgotPasswordDto = {
        email: 'invalid-email',
      };

      const expectedResponse = {
        message: 'Password reset email sent',
      };

      jest
        .spyOn(authService, 'forgotPassword')
        .mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.forgotPassword(forgotPasswordDto);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(authService.forgotPassword).toHaveBeenCalledWith('invalid-email');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      // Arrange
      const resetPasswordDto = {
        token: 'valid-reset-token',
        newPassword: 'NewSecurePassword123!',
      };

      const expectedResponse = {
        message: 'Password reset successfully',
        status: 'success',
      };

      jest
        .spyOn(authService, 'resetPassword')
        .mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.resetPassword(resetPasswordDto);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(authService.resetPassword).toHaveBeenCalledWith(
        'valid-reset-token',
        'NewSecurePassword123!'
      );
    });

    it('should handle reset password with invalid token', async () => {
      // Arrange
      const resetPasswordDto = {
        token: 'invalid-token',
        newPassword: 'NewSecurePassword123!',
      };

      jest
        .spyOn(authService, 'resetPassword')
        .mockRejectedValue(new BadRequestException('Invalid reset token'));

      // Act & Assert
      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException
      );
      expect(authService.resetPassword).toHaveBeenCalledWith(
        'invalid-token',
        'NewSecurePassword123!'
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const refreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const mockRequest = {
        ip: '192.168.1.1',
        connection: { remoteAddress: '192.168.1.1' },
      } as any;

      jest
        .spyOn(authService, 'refreshToken')
        .mockResolvedValue(mockLoginResponse);

      // Act
      const result = await controller.refreshToken(
        refreshTokenDto,
        mockRequest
      );

      // Assert
      expect(result).toEqual(mockLoginResponse);
      expect(authService.refreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
        '192.168.1.1'
      );
    });

    it('should handle refresh token with invalid token', async () => {
      // Arrange
      const refreshTokenDto = {
        refreshToken: 'invalid-refresh-token',
      };

      const mockRequest = {
        ip: '192.168.1.1',
        connection: { remoteAddress: '192.168.1.1' },
      } as any;

      jest
        .spyOn(authService, 'refreshToken')
        .mockRejectedValue(new UnauthorizedException('Invalid refresh token'));

      // Act & Assert
      await expect(
        controller.refreshToken(refreshTokenDto, mockRequest)
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.refreshToken).toHaveBeenCalledWith(
        'invalid-refresh-token',
        '192.168.1.1'
      );
    });
  });

  describe('verifyMfaAndCompleteLogin', () => {
    it('should verify MFA and complete login successfully', async () => {
      // Arrange
      const verifyMfaDto = {
        userId: 'user-123',
        token: '123456',
      };

      jest
        .spyOn(authService, 'verifyMfaAndCompleteLogin')
        .mockResolvedValue(mockLoginResponse);

      // Act
      const result = await controller.verifyMfaAndCompleteLogin(verifyMfaDto);

      // Assert
      expect(result).toEqual(mockLoginResponse);
      expect(authService.verifyMfaAndCompleteLogin).toHaveBeenCalledWith(
        'user-123',
        '123456'
      );
    });

    it('should handle MFA verification with invalid token', async () => {
      // Arrange
      const verifyMfaDto = {
        userId: 'user-123',
        token: '000000',
      };

      jest
        .spyOn(authService, 'verifyMfaAndCompleteLogin')
        .mockRejectedValue(
          new UnauthorizedException('Invalid verification code')
        );

      // Act & Assert
      await expect(
        controller.verifyMfaAndCompleteLogin(verifyMfaDto)
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.verifyMfaAndCompleteLogin).toHaveBeenCalledWith(
        'user-123',
        '000000'
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Arrange
      const mockRequest = {
        user: { id: 'user-123' },
        body: { refreshToken: 'valid-refresh-token' },
      } as any;

      jest.spyOn(authService, 'logout').mockResolvedValue(undefined);

      // Act
      const result = await controller.logout(
        mockRequest,
        'valid-refresh-token'
      );

      // Assert
      expect(result).toBeUndefined();
      expect(authService.logout).toHaveBeenCalledWith(
        'valid-refresh-token',
        'user-123'
      );
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      // Arrange
      const mockRequest = {
        user: { id: 'user-123' },
      } as any;

      jest.spyOn(authService, 'getProfile').mockResolvedValue(mockUser as any);

      // Act
      const result = await controller.getProfile(mockRequest);

      // Assert
      expect(result).toEqual(mockUser);
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
    });

    it('should handle get profile for non-existent user', async () => {
      // Arrange
      const mockRequest = {
        user: { id: 'non-existent-user' },
      } as any;

      jest
        .spyOn(authService, 'getProfile')
        .mockRejectedValue(new BadRequestException('User not found'));

      // Act & Assert
      await expect(controller.getProfile(mockRequest)).rejects.toThrow(
        BadRequestException
      );
      expect(authService.getProfile).toHaveBeenCalledWith('non-existent-user');
    });
  });
});
