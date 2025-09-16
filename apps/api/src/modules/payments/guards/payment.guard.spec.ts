import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentGuard } from './payment.guard';
import { User } from '../../users/entities/user.entity';
import { UserRole, UserStatus } from '@app/shared';

describe('PaymentGuard', () => {
  let guard: PaymentGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockGetRequest: jest.Mock;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    tenantId: 'tenant-123',
    role: UserRole.OWNER,
    status: UserStatus.ACTIVE,
    authProvider: 'EMAIL',
    isActive: true,
    emailVerified: true,
    requireEmailVerification: false,
    requireKyc: false,
    kycVerified: true,
    isSuspended: false,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorBackupCodes: [],
    lastLoginAt: new Date(),
    passwordResetToken: null,
    passwordResetExpires: null,
    emailVerificationToken: null,
    emailVerificationExpires: null,
    kycDocuments: [],
    kycStatus: 'VERIFIED',
    kycSubmittedAt: new Date(),
    kycVerifiedAt: new Date(),
    kycRejectedAt: null,
    kycRejectionReason: null,
    permissions: ['payment:create', 'payment:read'],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PaymentGuard>(PaymentGuard);
    mockReflector = module.get(Reflector);
    mockGetRequest = jest.fn();
    const mockSwitchToHttp = jest.fn().mockReturnValue({
      getRequest: mockGetRequest,
    });

    mockExecutionContext = {
      switchToHttp: mockSwitchToHttp,
      getHandler: jest.fn(),
    } as any;
  });

  beforeEach(() => {
    // Set default mock return value for reflector
    mockReflector.get.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access for authenticated, active user with verified email', async () => {
      mockReflector.get.mockReturnValue([UserRole.OWNER]);
      mockGetRequest.mockReturnValue({
        user: mockUser,
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      mockGetRequest.mockReturnValue({
        user: null,
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException
      );
    });

    it('should throw ForbiddenException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, status: UserStatus.PENDING };
      mockGetRequest.mockReturnValue({
        user: inactiveUser,
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException when email is not verified', async () => {
      const userWithUnverifiedEmail = {
        ...mockUser,
        emailVerified: false,
      };
      mockGetRequest.mockReturnValue({
        user: userWithUnverifiedEmail,
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException
      );
    });

    it('should allow access when no specific roles are required', async () => {
      mockReflector.get.mockReturnValue(null);
      mockGetRequest.mockReturnValue({
        user: mockUser,
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow access when user has required role', async () => {
      mockReflector.get.mockReturnValue([UserRole.OWNER]);
      mockGetRequest.mockReturnValue({
        user: mockUser,
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required role', async () => {
      mockReflector.get.mockReturnValue([UserRole.ADMIN]);
      const userWithoutRole = {
        ...mockUser,
        role: UserRole.MEMBER,
      };
      mockGetRequest.mockReturnValue({
        user: userWithoutRole,
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException
      );
    });

    it('should allow access when user has at least one of the required roles', async () => {
      mockReflector.get.mockReturnValue([UserRole.OWNER, UserRole.ADMIN]);
      const userWithPartialRole = {
        ...mockUser,
        role: UserRole.OWNER,
      };
      mockGetRequest.mockReturnValue({
        user: userWithPartialRole,
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should handle user with no role', async () => {
      mockReflector.get.mockReturnValue([UserRole.OWNER]);
      const userWithoutRole = {
        ...mockUser,
        role: undefined,
      };
      mockGetRequest.mockReturnValue({
        user: userWithoutRole,
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException
      );
    });

    it('should handle user with empty role', async () => {
      mockReflector.get.mockReturnValue([UserRole.OWNER]);
      const userWithEmptyRole = { ...mockUser, role: '' };
      mockGetRequest.mockReturnValue({
        user: userWithEmptyRole,
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException
      );
    });
  });

  describe('error messages', () => {
    it('should provide clear error message for unauthenticated user', async () => {
      mockGetRequest.mockReturnValue({
        user: null,
      });

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect((error as Error).message).toBe(
          'Authentication required for payment operations'
        );
      }
    });

    it('should provide clear error message for inactive user', async () => {
      const inactiveUser = { ...mockUser, status: UserStatus.SUSPENDED };
      mockGetRequest.mockReturnValue({
        user: inactiveUser,
      });

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect((error as Error).message).toBe(
          'Inactive user cannot perform payment operations'
        );
      }
    });

    it('should provide clear error message for unverified email', async () => {
      const userWithEmailVerification = {
        ...mockUser,
        requireEmailVerification: true,
        emailVerified: false,
      };
      mockGetRequest.mockReturnValue({
        user: userWithEmailVerification,
      });

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect((error as Error).message).toBe(
          'Email verification required for payment operations'
        );
      }
    });

    it('should provide clear error message for unverified KYC', async () => {
      const userWithKyc = { ...mockUser, requireKyc: true, kycVerified: false };
      mockGetRequest.mockReturnValue({
        user: userWithKyc,
      });

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect((error as Error).message).toBe(
          'KYC verification required for payment operations'
        );
      }
    });

    it('should provide clear error message for suspended user', async () => {
      const suspendedUser = { ...mockUser, isSuspended: true };
      mockGetRequest.mockReturnValue({
        user: suspendedUser,
      });

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect((error as Error).message).toBe(
          'Suspended user cannot perform payment operations'
        );
      }
    });

    it('should provide clear error message for insufficient permissions', async () => {
      mockReflector.get.mockReturnValue(['payment:admin']);
      const userWithoutPermissions = {
        ...mockUser,
        permissions: ['payment:create'],
      };
      mockGetRequest.mockReturnValue({
        user: userWithoutPermissions,
      });

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect((error as Error).message).toBe(
          'Insufficient role for payment operation'
        );
      }
    });
  });
});
