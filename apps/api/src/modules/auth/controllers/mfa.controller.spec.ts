import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

import { MfaController } from './mfa.controller';
import { MfaService } from '../services/mfa.service';
import { AuthService } from '../services/auth.service';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { JwtService } from '../services/jwt.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { EmailService } from '../../email/services/email.service';
import { UserStatus, UserRole } from '@app/shared';

describe('MfaController', () => {
  let controller: MfaController;
  let mfaService: MfaService;
  let authService: AuthService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    tenantId: 'tenant-123',
    twoFactorEnabled: false,
    twoFactorVerified: false,
    backupCodes: ['ABC123', 'DEF456'],
  };

  const mockMfaSetup = {
    secret: 'JBSWY3DPEHPK3PXP',
    qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    backupCodes: [
      'ABC123',
      'DEF456',
      'GHI789',
      'JKL012',
      'MNO345',
      'PQR678',
      'STU901',
      'VWX234',
      'YZA567',
      'BCD890',
    ],
  };

  const mockMfaStatus = {
    isEnabled: true,
    isVerified: true,
    backupCodesRemaining: 8,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MfaController],
      providers: [
        {
          provide: MfaService,
          useValue: {
            setupTwoFactorAuth: jest.fn(),
            enableTwoFactorAuth: jest.fn(),
            disableTwoFactorAuth: jest.fn(),
            verifyTwoFactorAuth: jest.fn(),
            getTwoFactorStatus: jest.fn(),
            regenerateBackupCodes: jest.fn(),
            hasExceededAttempts: jest.fn(),
            resetAttempts: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
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
          provide: EmailService,
          useValue: {
            sendEmailVerification: jest.fn(),
            sendPasswordReset: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MfaController>(MfaController);
    mfaService = module.get<MfaService>(MfaService);
    authService = module.get<AuthService>(AuthService);
  });

  describe('setupMfa', () => {
    it('should setup MFA successfully', async () => {
      // Arrange
      const setupMfaDto = {
        userId: 'user-123',
      };

      const mockRequest = {
        user: { sub: 'user-123' },
      } as any;

      jest.spyOn(authService, 'getProfile').mockResolvedValue(mockUser as any);
      jest
        .spyOn(mfaService, 'setupTwoFactorAuth')
        .mockResolvedValue(mockMfaSetup);

      // Act
      const result = await controller.setupMfa(setupMfaDto);

      // Assert
      expect(result).toEqual(mockMfaSetup);
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mfaService.setupTwoFactorAuth).toHaveBeenCalledWith(mockUser);
    });

    it('should handle setup MFA for non-existent user', async () => {
      // Arrange
      const setupMfaDto = {
        userId: 'non-existent-user',
      };

      jest
        .spyOn(authService, 'getProfile')
        .mockRejectedValue(new BadRequestException('User not found'));

      // Act & Assert
      await expect(controller.setupMfa(setupMfaDto)).rejects.toThrow(
        BadRequestException
      );
      expect(authService.getProfile).toHaveBeenCalledWith('non-existent-user');
    });
  });

  describe('enableMfa', () => {
    it('should enable MFA successfully', async () => {
      // Arrange
      const enableMfaDto = {
        token: '123456',
      };

      const mockRequest = {
        user: { sub: 'user-123' },
      } as any;

      jest.spyOn(authService, 'getProfile').mockResolvedValue(mockUser as any);
      jest
        .spyOn(mfaService, 'enableTwoFactorAuth')
        .mockResolvedValue(undefined);

      // Act
      const result = await controller.enableMfa(enableMfaDto, mockRequest);

      // Assert
      expect(result).toEqual({
        message: 'Two-factor authentication enabled successfully',
      });
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mfaService.enableTwoFactorAuth).toHaveBeenCalledWith(
        mockUser,
        '123456'
      );
    });

    it('should handle enable MFA with invalid token', async () => {
      // Arrange
      const enableMfaDto = {
        token: '000000',
      };

      const mockRequest = {
        user: { sub: 'user-123' },
      } as any;

      jest.spyOn(authService, 'getProfile').mockResolvedValue(mockUser as any);
      jest
        .spyOn(mfaService, 'enableTwoFactorAuth')
        .mockRejectedValue(
          new UnauthorizedException('Invalid verification code')
        );

      // Act & Assert
      await expect(
        controller.enableMfa(enableMfaDto, mockRequest)
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mfaService.enableTwoFactorAuth).toHaveBeenCalledWith(
        mockUser,
        '000000'
      );
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA successfully', async () => {
      // Arrange
      const disableMfaDto = {
        token: '123456',
      };

      const mockRequest = {
        user: { sub: 'user-123' },
      } as any;

      const enabledUser = { ...mockUser, twoFactorEnabled: true };

      jest
        .spyOn(authService, 'getProfile')
        .mockResolvedValue(enabledUser as any);
      jest
        .spyOn(mfaService, 'disableTwoFactorAuth')
        .mockResolvedValue(undefined);

      // Act
      const result = await controller.disableMfa(disableMfaDto, mockRequest);

      // Assert
      expect(result).toEqual({
        message: 'Two-factor authentication disabled successfully',
      });
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mfaService.disableTwoFactorAuth).toHaveBeenCalledWith(
        enabledUser,
        '123456'
      );
    });

    it('should handle disable MFA with invalid token', async () => {
      // Arrange
      const disableMfaDto = {
        token: '000000',
      };

      const mockRequest = {
        user: { sub: 'user-123' },
      } as any;

      const enabledUser = { ...mockUser, twoFactorEnabled: true };

      jest
        .spyOn(authService, 'getProfile')
        .mockResolvedValue(enabledUser as any);
      jest
        .spyOn(mfaService, 'disableTwoFactorAuth')
        .mockRejectedValue(
          new UnauthorizedException('Invalid verification code')
        );

      // Act & Assert
      await expect(
        controller.disableMfa(disableMfaDto, mockRequest)
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mfaService.disableTwoFactorAuth).toHaveBeenCalledWith(
        enabledUser,
        '000000'
      );
    });
  });

  describe('verifyMfa', () => {
    it('should verify MFA successfully', async () => {
      // Arrange
      const verifyMfaDto = {
        token: '123456',
        userId: 'user-123',
      };

      jest.spyOn(authService, 'getProfile').mockResolvedValue(mockUser as any);
      jest.spyOn(mfaService, 'hasExceededAttempts').mockReturnValue(false);
      jest.spyOn(mfaService, 'verifyTwoFactorAuth').mockResolvedValue(true);
      jest.spyOn(mfaService, 'resetAttempts').mockResolvedValue(undefined);

      // Act
      const result = await controller.verifyMfa(verifyMfaDto);

      // Assert
      expect(result).toEqual({
        isValid: true,
        message: 'Verification successful',
      });
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mfaService.hasExceededAttempts).toHaveBeenCalledWith(mockUser);
      expect(mfaService.verifyTwoFactorAuth).toHaveBeenCalledWith(
        mockUser,
        '123456'
      );
      expect(mfaService.resetAttempts).toHaveBeenCalledWith(mockUser);
    });

    it('should handle MFA verification with invalid token', async () => {
      // Arrange
      const verifyMfaDto = {
        token: '000000',
        userId: 'user-123',
      };

      jest.spyOn(authService, 'getProfile').mockResolvedValue(mockUser as any);
      jest.spyOn(mfaService, 'hasExceededAttempts').mockReturnValue(false);
      jest.spyOn(mfaService, 'verifyTwoFactorAuth').mockResolvedValue(false);

      // Act
      const result = await controller.verifyMfa(verifyMfaDto);

      // Assert
      expect(result).toEqual({
        isValid: false,
        message: 'Invalid verification code',
      });
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mfaService.hasExceededAttempts).toHaveBeenCalledWith(mockUser);
      expect(mfaService.verifyTwoFactorAuth).toHaveBeenCalledWith(
        mockUser,
        '000000'
      );
    });

    it('should handle MFA verification with exceeded attempts', async () => {
      // Arrange
      const verifyMfaDto = {
        token: '123456',
        userId: 'user-123',
      };

      jest.spyOn(authService, 'getProfile').mockResolvedValue(mockUser as any);
      jest.spyOn(mfaService, 'hasExceededAttempts').mockReturnValue(true);

      // Act
      const result = await controller.verifyMfa(verifyMfaDto);

      // Assert
      expect(result).toEqual({
        isValid: false,
        message: 'Too many failed attempts. Please try again later.',
      });
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mfaService.hasExceededAttempts).toHaveBeenCalledWith(mockUser);
      expect(mfaService.verifyTwoFactorAuth).not.toHaveBeenCalled();
    });
  });

  describe('getMfaStatus', () => {
    it('should get MFA status successfully', async () => {
      // Arrange
      const mockRequest = {
        user: { sub: 'user-123' },
      } as any;

      jest.spyOn(authService, 'getProfile').mockResolvedValue(mockUser as any);
      jest
        .spyOn(mfaService, 'getTwoFactorStatus')
        .mockResolvedValue(mockMfaStatus);

      // Act
      const result = await controller.getMfaStatus(mockRequest);

      // Assert
      expect(result).toEqual(mockMfaStatus);
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mfaService.getTwoFactorStatus).toHaveBeenCalledWith(mockUser);
    });

    it('should handle get MFA status for non-existent user', async () => {
      // Arrange
      const mockRequest = {
        user: { sub: 'non-existent-user' },
      } as any;

      jest
        .spyOn(authService, 'getProfile')
        .mockRejectedValue(new BadRequestException('User not found'));

      // Act & Assert
      await expect(controller.getMfaStatus(mockRequest)).rejects.toThrow(
        BadRequestException
      );
      expect(authService.getProfile).toHaveBeenCalledWith('non-existent-user');
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should regenerate backup codes successfully', async () => {
      // Arrange
      const regenerateBackupCodesDto = {
        token: '123456',
      };

      const mockRequest = {
        user: { sub: 'user-123' },
      } as any;

      const enabledUser = { ...mockUser, twoFactorEnabled: true };
      const newBackupCodes = [
        'NEW123',
        'NEW456',
        'NEW789',
        'NEW012',
        'NEW345',
        'NEW678',
        'NEW901',
        'NEW234',
        'NEW567',
        'NEW890',
      ];

      jest
        .spyOn(authService, 'getProfile')
        .mockResolvedValue(enabledUser as any);
      jest
        .spyOn(mfaService, 'regenerateBackupCodes')
        .mockResolvedValue(newBackupCodes);

      // Act
      const result = await controller.regenerateBackupCodes(
        regenerateBackupCodesDto,
        mockRequest
      );

      // Assert
      expect(result).toEqual({ backupCodes: newBackupCodes });
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mfaService.regenerateBackupCodes).toHaveBeenCalledWith(
        enabledUser,
        '123456'
      );
    });

    it('should handle regenerate backup codes with invalid token', async () => {
      // Arrange
      const regenerateBackupCodesDto = {
        token: '000000',
      };

      const mockRequest = {
        user: { sub: 'user-123' },
      } as any;

      const enabledUser = { ...mockUser, twoFactorEnabled: true };

      jest
        .spyOn(authService, 'getProfile')
        .mockResolvedValue(enabledUser as any);
      jest
        .spyOn(mfaService, 'regenerateBackupCodes')
        .mockRejectedValue(
          new UnauthorizedException('Invalid verification code')
        );

      // Act & Assert
      await expect(
        controller.regenerateBackupCodes(regenerateBackupCodesDto, mockRequest)
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mfaService.regenerateBackupCodes).toHaveBeenCalledWith(
        enabledUser,
        '000000'
      );
    });
  });
});
