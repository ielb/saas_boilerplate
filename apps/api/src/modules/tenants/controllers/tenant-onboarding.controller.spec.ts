import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuditInterceptor } from '../../audit/interceptors/audit.interceptor';
import { AuditService } from '../../audit/services/audit.service';

import { TenantOnboardingController } from './tenant-onboarding.controller';
import { TenantOnboardingService } from '../services/tenant-onboarding.service';
import {
  TenantOnboardingDto,
  OnboardingProgressDto,
  VerifyOnboardingDto,
  ResendVerificationDto,
  CancelOnboardingDto,
  OnboardingResponseDto,
} from '../dto/tenant-onboarding.dto';
import {
  OnboardingStep,
  OnboardingStatus,
} from '../entities/tenant-onboarding.entity';

describe('TenantOnboardingController', () => {
  let controller: TenantOnboardingController;
  let onboardingService: jest.Mocked<TenantOnboardingService>;

  const mockOnboardingResponse: OnboardingResponseDto = {
    onboardingId: 'onboarding-id',
    status: OnboardingStatus.IN_PROGRESS,
    currentStep: OnboardingStep.TENANT_SETUP,
    progressPercentage: 14,
    nextAction: 'Creating admin user account...',
    estimatedCompletion: new Date(),
  };

  const mockOnboardingProgress: OnboardingProgressDto = {
    onboardingId: 'onboarding-id',
    currentStep: OnboardingStep.ADMIN_USER_CREATION,
    status: OnboardingStatus.IN_PROGRESS,
    completedSteps: [OnboardingStep.TENANT_SETUP],
    progressPercentage: 28,
    tenantId: 'tenant-id',
    adminUserId: 'user-id',
    estimatedCompletion: new Date(),
    nextAction: 'Configuring subscription plan...',
  };

  beforeEach(async () => {
    const mockOnboardingService = {
      startOnboarding: jest.fn(),
      getOnboardingProgress: jest.fn(),
      verifyOnboarding: jest.fn(),
      resendVerification: jest.fn(),
      cancelOnboarding: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
      decode: jest.fn(),
    };

    const mockAuditService = {
      logEvent: jest.fn(),
      createAuditLog: jest.fn(),
    };

    const mockAuthGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const mockRolesGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const mockAuditInterceptor = {
      intercept: jest.fn().mockImplementation((context, next) => next.handle()),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantOnboardingController],
      providers: [
        {
          provide: TenantOnboardingService,
          useValue: mockOnboardingService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .overrideInterceptor(AuditInterceptor)
      .useValue(mockAuditInterceptor)
      .compile();

    controller = module.get<TenantOnboardingController>(
      TenantOnboardingController
    );
    onboardingService = module.get(TenantOnboardingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startOnboarding', () => {
    const validOnboardingDto: TenantOnboardingDto = {
      name: 'Test Tenant',
      adminUser: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'admin@test.com',
        password: 'SecurePass123!',
      },
      plan: 'free',
      sendWelcomeEmail: true,
      autoVerify: false,
    };

    const mockRequest = {
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Test Agent',
      },
      connection: { remoteAddress: '127.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('Test Agent'),
    } as unknown as Request;

    it('should start onboarding successfully', async () => {
      // Arrange
      onboardingService.startOnboarding.mockResolvedValue(
        mockOnboardingResponse
      );

      // Act
      const result = await controller.startOnboarding(
        validOnboardingDto,
        mockRequest
      );

      // Assert
      expect(onboardingService.startOnboarding).toHaveBeenCalledWith(
        validOnboardingDto,
        '192.168.1.1',
        'Test Agent'
      );
      expect(result).toEqual(mockOnboardingResponse);
    });

    it('should extract IP address correctly from various headers', async () => {
      // Arrange
      const requestWithRealIp = {
        headers: {
          'x-real-ip': '10.0.0.1',
        },
        connection: { remoteAddress: '127.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' },
        get: jest.fn().mockReturnValue('Test Agent'),
      } as unknown as Request;

      onboardingService.startOnboarding.mockResolvedValue(
        mockOnboardingResponse
      );

      // Act
      await controller.startOnboarding(validOnboardingDto, requestWithRealIp);

      // Assert
      expect(onboardingService.startOnboarding).toHaveBeenCalledWith(
        validOnboardingDto,
        '10.0.0.1',
        'Test Agent'
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      onboardingService.startOnboarding.mockRejectedValue(
        new Error('Service error')
      );

      // Act & Assert
      await expect(
        controller.startOnboarding(validOnboardingDto, mockRequest)
      ).rejects.toThrow('Service error');
    });
  });

  describe('getOnboardingProgress', () => {
    it('should return onboarding progress successfully', async () => {
      // Arrange
      onboardingService.getOnboardingProgress.mockResolvedValue(
        mockOnboardingProgress
      );

      // Act
      const result = await controller.getOnboardingProgress('onboarding-id');

      // Assert
      expect(onboardingService.getOnboardingProgress).toHaveBeenCalledWith(
        'onboarding-id'
      );
      expect(result).toEqual(mockOnboardingProgress);
    });

    it('should handle service errors', async () => {
      // Arrange
      onboardingService.getOnboardingProgress.mockRejectedValue(
        new Error('Not found')
      );

      // Act & Assert
      await expect(
        controller.getOnboardingProgress('invalid-id')
      ).rejects.toThrow('Not found');
    });
  });

  describe('verifyOnboarding', () => {
    const verifyDto: VerifyOnboardingDto = {
      onboardingId: 'onboarding-id',
      verificationToken: 'valid-token',
    };

    it('should verify onboarding successfully', async () => {
      // Arrange
      const verifiedResponse = {
        ...mockOnboardingResponse,
        status: OnboardingStatus.COMPLETED,
        currentStep: OnboardingStep.COMPLETION,
        progressPercentage: 100,
      };
      onboardingService.verifyOnboarding.mockResolvedValue(verifiedResponse);

      // Act
      const result = await controller.verifyOnboarding(
        'onboarding-id',
        verifyDto
      );

      // Assert
      expect(onboardingService.verifyOnboarding).toHaveBeenCalledWith(
        verifyDto
      );
      expect(result).toEqual(verifiedResponse);
    });

    it('should throw BadRequestException if onboarding ID mismatch', async () => {
      // Arrange
      const mismatchedDto = {
        ...verifyDto,
        onboardingId: 'different-id',
      };

      // Act & Assert
      await expect(
        controller.verifyOnboarding('onboarding-id', mismatchedDto)
      ).rejects.toThrow(BadRequestException);

      expect(onboardingService.verifyOnboarding).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      // Arrange
      onboardingService.verifyOnboarding.mockRejectedValue(
        new Error('Invalid token')
      );

      // Act & Assert
      await expect(
        controller.verifyOnboarding('onboarding-id', verifyDto)
      ).rejects.toThrow('Invalid token');
    });
  });

  describe('resendVerification', () => {
    const resendDto: ResendVerificationDto = {
      onboardingId: 'onboarding-id',
    };

    it('should resend verification email successfully', async () => {
      // Arrange
      const expectedResponse = {
        message: 'Verification email sent successfully',
      };
      onboardingService.resendVerification.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.resendVerification(
        'onboarding-id',
        resendDto
      );

      // Assert
      expect(onboardingService.resendVerification).toHaveBeenCalledWith(
        resendDto
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw BadRequestException if onboarding ID mismatch', async () => {
      // Arrange
      const mismatchedDto = {
        ...resendDto,
        onboardingId: 'different-id',
      };

      // Act & Assert
      await expect(
        controller.resendVerification('onboarding-id', mismatchedDto)
      ).rejects.toThrow(BadRequestException);

      expect(onboardingService.resendVerification).not.toHaveBeenCalled();
    });
  });

  describe('cancelOnboarding', () => {
    const cancelDto: CancelOnboardingDto = {
      onboardingId: 'onboarding-id',
      reason: 'User decided not to proceed',
      cleanup: true,
    };

    it('should cancel onboarding successfully', async () => {
      // Arrange
      const expectedResponse = { message: 'Onboarding cancelled successfully' };
      onboardingService.cancelOnboarding.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.cancelOnboarding(
        'onboarding-id',
        cancelDto
      );

      // Assert
      expect(onboardingService.cancelOnboarding).toHaveBeenCalledWith(
        cancelDto
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw BadRequestException if onboarding ID mismatch', async () => {
      // Arrange
      const mismatchedDto = {
        ...cancelDto,
        onboardingId: 'different-id',
      };

      // Act & Assert
      await expect(
        controller.cancelOnboarding('onboarding-id', mismatchedDto)
      ).rejects.toThrow(BadRequestException);

      expect(onboardingService.cancelOnboarding).not.toHaveBeenCalled();
    });
  });

  describe('checkOnboardingHealth', () => {
    it('should return healthy status for active onboarding', async () => {
      // Arrange
      const activeProgress = {
        ...mockOnboardingProgress,
        status: OnboardingStatus.IN_PROGRESS,
        currentStep: OnboardingStep.ADMIN_USER_CREATION,
        estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      };
      onboardingService.getOnboardingProgress.mockResolvedValue(activeProgress);

      // Act
      const result = await controller.checkOnboardingHealth('onboarding-id');

      // Assert
      expect(result).toEqual({
        status: 'healthy',
        onboardingId: 'onboarding-id',
        currentStep: OnboardingStep.ADMIN_USER_CREATION,
        issues: [],
        lastActivity: activeProgress.estimatedCompletion,
      });
    });

    it('should return error status for failed onboarding', async () => {
      // Arrange
      const failedProgress = {
        ...mockOnboardingProgress,
        status: OnboardingStatus.FAILED,
      };
      onboardingService.getOnboardingProgress.mockResolvedValue(failedProgress);

      // Act
      const result = await controller.checkOnboardingHealth('onboarding-id');

      // Assert
      expect(result).toEqual({
        status: 'error',
        onboardingId: 'onboarding-id',
        currentStep: failedProgress.currentStep,
        issues: ['Onboarding process has failed'],
        lastActivity: expect.any(Date),
      });
    });

    it('should return warning status for cancelled onboarding', async () => {
      // Arrange
      const cancelledProgress = {
        ...mockOnboardingProgress,
        status: OnboardingStatus.CANCELLED,
      };
      onboardingService.getOnboardingProgress.mockResolvedValue(
        cancelledProgress
      );

      // Act
      const result = await controller.checkOnboardingHealth('onboarding-id');

      // Assert
      expect(result).toEqual({
        status: 'warning',
        onboardingId: 'onboarding-id',
        currentStep: cancelledProgress.currentStep,
        issues: ['Onboarding process was cancelled'],
        lastActivity: expect.any(Date),
      });
    });

    it('should return warning status for verification pending too long', async () => {
      // Arrange
      const staleVerificationProgress = {
        ...mockOnboardingProgress,
        status: OnboardingStatus.IN_PROGRESS,
        currentStep: OnboardingStep.VERIFICATION,
        estimatedCompletion: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };
      onboardingService.getOnboardingProgress.mockResolvedValue(
        staleVerificationProgress
      );

      // Act
      const result = await controller.checkOnboardingHealth('onboarding-id');

      // Assert
      expect(result).toEqual({
        status: 'warning',
        onboardingId: 'onboarding-id',
        currentStep: OnboardingStep.VERIFICATION,
        issues: ['Verification has been pending for more than 24 hours'],
        lastActivity: staleVerificationProgress.estimatedCompletion,
      });
    });
  });
});
