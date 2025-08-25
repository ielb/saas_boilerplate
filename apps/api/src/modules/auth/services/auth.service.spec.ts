import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { JwtService } from './jwt.service';
import { RefreshTokenService } from './refresh-token.service';
import { MfaService } from './mfa.service';
import { EmailService } from '../../email/services/email.service';
import { SessionService } from './session.service';
import { RoleService } from '../../rbac/services/role.service';
import { PermissionService } from '../../rbac/services/permission.service';
import { UserStatus } from '@app/shared';

describe('AuthService - Password Reset', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let tenantRepository: Repository<Tenant>;
  let emailService: EmailService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    status: UserStatus.ACTIVE,
    passwordResetToken: null,
    passwordResetTokenExpiresAt: null,
    generatePasswordResetToken: jest.fn(),
    isPasswordResetTokenValid: jest.fn(),
    hashPassword: jest.fn(),
  } as any;

  const mockTenant = {
    id: 'tenant-123',
    name: 'Test Tenant',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
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
            sendPasswordReset: jest.fn(),
            sendEmailVerification: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            generateDeviceFingerprint: jest.fn(),
            parseBrowserInfo: jest.fn(),
            parseOperatingSystem: jest.fn(),
            detectDeviceType: jest.fn(),
            createSession: jest.fn(),
            getUserSessions: jest.fn(),
            revokeSession: jest.fn(),
          },
        },
        {
          provide: RoleService,
          useValue: {
            getDefaultRole: jest.fn(),
            assignRoleToUser: jest.fn(),
            getRoleByName: jest.fn(),
            createDefaultRoles: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            createDefaultPermissions: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    tenantRepository = module.get<Repository<Tenant>>(
      getRepositoryToken(Tenant)
    );
    emailService = module.get<EmailService>(EmailService);
  });

  describe('forgotPassword', () => {
    it('should send password reset email for existing user', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUserWithToken = {
        ...mockUser,
        generatePasswordResetToken: jest.fn(),
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUserWithToken);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUserWithToken);
      jest
        .spyOn(emailService, 'sendPasswordReset')
        .mockResolvedValue(undefined);

      // Act
      const result = await service.forgotPassword(email);

      // Assert
      expect(result).toEqual({ message: 'Password reset email sent' });
      expect(mockUserWithToken.generatePasswordResetToken).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalledWith(mockUserWithToken);
      expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
        mockUserWithToken
      );
    });

    it('should not reveal if user does not exist', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.forgotPassword(email);

      // Assert
      expect(result).toEqual({ message: 'Password reset email sent' });
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should not send email for inactive user', async () => {
      // Arrange
      const email = 'test@example.com';
      const inactiveUser = { ...mockUser, status: UserStatus.SUSPENDED };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);

      // Act
      const result = await service.forgotPassword(email);

      // Assert
      expect(result).toEqual({ message: 'Password reset email sent' });
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should handle email service failure', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUserWithToken = {
        ...mockUser,
        generatePasswordResetToken: jest.fn(),
      };

      // Mock the logger to suppress error output
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUserWithToken);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUserWithToken);
      jest
        .spyOn(emailService, 'sendPasswordReset')
        .mockRejectedValue(new Error('Email service error'));

      // Act & Assert
      await expect(service.forgotPassword(email)).rejects.toThrow(
        BadRequestException
      );
      expect(mockUserWithToken.generatePasswordResetToken).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalled();

      // Restore logger
      loggerSpy.mockRestore();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      // Arrange
      const token = 'valid-token';
      const newPassword = 'NewSecurePassword123!';
      const mockUserWithToken = {
        ...mockUser,
        passwordResetToken: token,
        passwordResetTokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isPasswordResetTokenValid: jest.fn().mockReturnValue(true),
        hashPassword: jest.fn(),
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUserWithToken);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUserWithToken);

      // Act
      const result = await service.resetPassword(token, newPassword);

      // Assert
      expect(result).toEqual({
        message: 'Password reset successfully',
        status: 'success',
      });
      expect(mockUserWithToken.password).toBe(newPassword);
      expect(mockUserWithToken.passwordResetToken).toBeNull();
      expect(mockUserWithToken.passwordResetTokenExpiresAt).toBeNull();
      expect(mockUserWithToken.hashPassword).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalledWith(mockUserWithToken);
    });

    it('should throw error for invalid token', async () => {
      // Arrange
      const token = 'invalid-token';
      const newPassword = 'NewSecurePassword123!';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        BadRequestException
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error for expired token', async () => {
      // Arrange
      const token = 'expired-token';
      const newPassword = 'NewSecurePassword123!';
      const mockUserWithExpiredToken = {
        ...mockUser,
        passwordResetToken: token,
        passwordResetTokenExpiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        isPasswordResetTokenValid: jest.fn().mockReturnValue(false),
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUserWithExpiredToken);

      // Act & Assert
      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        BadRequestException
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error for inactive user', async () => {
      // Arrange
      const token = 'valid-token';
      const newPassword = 'NewSecurePassword123!';
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED,
        passwordResetToken: token,
        passwordResetTokenExpiresAt: new Date(Date.now() + 3600000),
        isPasswordResetTokenValid: jest.fn().mockReturnValue(true),
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        BadRequestException
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });
});
