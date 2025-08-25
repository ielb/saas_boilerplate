import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

import { MfaService } from './mfa.service';
import { User } from '../../users/entities/user.entity';
import { UserStatus, UserRole, AuthProvider } from '@app/shared';

describe('MfaService', () => {
  let service: MfaService;
  let userRepository: Repository<User>;

  const createMockUser = (overrides: Partial<User> = {}): User => {
    const baseUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
      tenantId: 'tenant-123',
      authProvider: AuthProvider.LOCAL,
      emailVerified: false,
      twoFactorEnabled: false,
      twoFactorVerified: false,
      twoFactorSecret: null,
      backupCodes: [],
      twoFactorAttempts: 0,
      lastTwoFactorAttempt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as User;

    return { ...baseUser, ...overrides } as User;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn().mockImplementation(user => Promise.resolve(user)),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('generateSecret', () => {
    it('should generate secret for user', async () => {
      // Arrange
      const user = createMockUser();

      // Act
      const result = await service.generateSecret(user);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code successfully', async () => {
      // Arrange
      const user = createMockUser();
      const secret = 'JBSWY3DPEHPK3PXP';

      // Act
      const result = await service.generateQRCode(user, secret);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes', () => {
      // Act
      const result = service.generateBackupCodes();

      // Assert
      expect(result).toHaveLength(10);
      expect(result.every(code => /^[A-Z0-9]+$/.test(code))).toBe(true);
      expect(new Set(result).size).toBe(10); // All codes should be unique
    });
  });

  describe('getTwoFactorStatus', () => {
    it('should get MFA status for enabled user', async () => {
      // Arrange
      const userWithMfa = createMockUser({
        twoFactorEnabled: true,
        twoFactorVerified: true,
        backupCodes: ['ABC123', 'DEF456'],
      });

      // Act
      const result = await service.getTwoFactorStatus(userWithMfa);

      // Assert
      expect(result).toEqual({
        isEnabled: true,
        isVerified: true,
        backupCodesRemaining: 2,
      });
    });

    it('should get MFA status for disabled user', async () => {
      // Arrange
      const userWithoutMfa = createMockUser({
        twoFactorEnabled: false,
        twoFactorVerified: false,
        backupCodes: [],
      });

      // Act
      const result = await service.getTwoFactorStatus(userWithoutMfa);

      // Assert
      expect(result).toEqual({
        isEnabled: false,
        isVerified: false,
        backupCodesRemaining: 0,
      });
    });
  });

  describe('hasExceededAttempts', () => {
    it('should return true when attempts exceeded', () => {
      // Arrange
      const userWithExceededAttempts = createMockUser({
        twoFactorAttempts: 5,
        lastTwoFactorAttempt: new Date(),
      });

      // Act
      const result = service.hasExceededAttempts(userWithExceededAttempts);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when attempts not exceeded', () => {
      // Arrange
      const userWithNormalAttempts = createMockUser({
        twoFactorAttempts: 2,
        lastTwoFactorAttempt: new Date(),
      });

      // Act
      const result = service.hasExceededAttempts(userWithNormalAttempts);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when last attempt was more than 15 minutes ago', () => {
      // Arrange
      const userWithOldAttempts = createMockUser({
        twoFactorAttempts: 5,
        lastTwoFactorAttempt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      });

      // Act
      const result = service.hasExceededAttempts(userWithOldAttempts);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('resetAttempts', () => {
    it('should reset attempts successfully', async () => {
      // Arrange
      const userWithAttempts = createMockUser({
        twoFactorAttempts: 3,
        lastTwoFactorAttempt: new Date(),
      });

      // Act
      await service.resetAttempts(userWithAttempts);

      // Assert
      expect(userWithAttempts.twoFactorAttempts).toBe(0);
      expect(userWithAttempts.lastTwoFactorAttempt).toBeNull();
      expect(userRepository.save).toHaveBeenCalledWith(userWithAttempts);
    });
  });

  describe('verifyTwoFactorAuth', () => {
    it('should handle invalid backup code', async () => {
      // Arrange
      const userWithBackupCodes = createMockUser({
        twoFactorEnabled: true,
        backupCodes: ['ABC123', 'DEF456'],
      });
      const invalidCode = 'INVALID';

      // Act
      const result = await service.verifyTwoFactorAuth(
        userWithBackupCodes,
        invalidCode
      );

      // Assert
      expect(result).toBe(false);
    });
  });
});
