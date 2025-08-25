import { Test, TestingModule } from '@nestjs/testing';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { TenantOnboardingService } from './tenant-onboarding.service';
import { TenantService } from './tenant.service';
import { AuthService } from '../../auth/services/auth.service';
import { EmailService } from '../../email/services/email.service';
import {
  TenantOnboarding,
  OnboardingStep,
  OnboardingStatus,
} from '../entities/tenant-onboarding.entity';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '@app/shared';
import { TenantOnboardingDto } from '../dto/tenant-onboarding.dto';

describe('TenantOnboardingService', () => {
  let service: TenantOnboardingService;
  let onboardingRepository: jest.Mocked<Repository<TenantOnboarding>>;
  let tenantRepository: jest.Mocked<Repository<Tenant>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let tenantService: jest.Mocked<TenantService>;
  let authService: jest.Mocked<AuthService>;
  let emailService: jest.Mocked<EmailService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockOnboarding: Partial<TenantOnboarding> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    currentStep: OnboardingStep.TENANT_SETUP,
    status: OnboardingStatus.IN_PROGRESS,
    completedSteps: [],
    progressPercentage: 0,
    tenantId: '123e4567-e89b-12d3-a456-426614174001',
    adminUserId: '123e4567-e89b-12d3-a456-426614174002',
    estimatedCompletion: new Date(),
    nextAction: 'Starting tenant setup...',
    onboardingData: {
      tenantName: 'Test Tenant',
      adminUser: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'admin@test.com',
      },
    },
    sendWelcomeEmail: true,
    autoVerify: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Add entity methods as mocks
    addCompletedStep: jest.fn(),
    updateProgress: jest.fn(),
    addError: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
    cancel: jest.fn(),
    setStepData: jest.fn(),
    getStepData: jest.fn(),
    getNextStep: jest.fn().mockReturnValue(OnboardingStep.ADMIN_USER_CREATION),
    isStepCompleted: jest.fn().mockReturnValue(false),
    getErrorCount: jest.fn().mockReturnValue(0),
    // Add getter properties as simple boolean values for mocking
    isCompleted: false,
    isCancelled: false,
    isVerificationTokenExpired: false,
  };

  const mockTenant: Partial<Tenant> = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Tenant',
    isActive: true,
    isVerified: false,
    plan: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser: Partial<User> = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    email: 'admin@test.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.OWNER,
    tenantId: '123e4567-e89b-12d3-a456-426614174001',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockOnboardingRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockTenantRepository = {
      findOne: jest.fn(),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const mockTenantService = {
      createTenant: jest.fn(),
      updateFeatureFlag: jest.fn(),
    };

    const mockAuthService = {
      register: jest.fn(),
    };

    const mockEmailService = {
      sendTenantOnboardingVerificationEmail: jest.fn(),
      sendTenantOnboardingWelcomeEmail: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantOnboardingService,
        {
          provide: getRepositoryToken(TenantOnboarding),
          useValue: mockOnboardingRepository,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TenantOnboardingService>(TenantOnboardingService);
    onboardingRepository = module.get(getRepositoryToken(TenantOnboarding));
    tenantRepository = module.get(getRepositoryToken(Tenant));
    userRepository = module.get(getRepositoryToken(User));
    tenantService = module.get(TenantService);
    authService = module.get(AuthService);
    emailService = module.get(EmailService);
    dataSource = module.get(DataSource);
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

    it('should start onboarding successfully', async () => {
      // Arrange
      tenantRepository.findOne.mockResolvedValue(null); // No existing tenant
      userRepository.findOne.mockResolvedValue(null); // No existing user
      onboardingRepository.create.mockReturnValue(
        mockOnboarding as TenantOnboarding
      );
      onboardingRepository.save.mockResolvedValue(
        mockOnboarding as TenantOnboarding
      );
      onboardingRepository.findOne.mockResolvedValue(
        mockOnboarding as TenantOnboarding
      );

      // Mock the processNextStep method by spying on it
      const processNextStepSpy = jest
        .spyOn(service as any, 'processNextStep')
        .mockResolvedValue({
          success: true,
          nextStep: OnboardingStep.ADMIN_USER_CREATION,
        });

      // Act
      const result = await service.startOnboarding(
        validOnboardingDto,
        '127.0.0.1',
        'test-agent'
      );

      // Assert
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { name: validOnboardingDto.name },
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: validOnboardingDto.adminUser.email },
      });
      // No longer using repository.create, entity is created directly
      expect(onboardingRepository.save).toHaveBeenCalled();
      expect(processNextStepSpy).toHaveBeenCalledWith(mockOnboarding.id);
      expect(result).toEqual({
        onboardingId: mockOnboarding.id,
        status: mockOnboarding.status,
        currentStep: mockOnboarding.currentStep,
        progressPercentage: mockOnboarding.progressPercentage,
        nextAction: expect.any(String),
        tenantId: mockOnboarding.tenantId,
        adminUserId: mockOnboarding.adminUserId,
        estimatedCompletion: expect.any(Date),
      });
    });

    it('should throw ConflictException if tenant name already exists', async () => {
      // Arrange
      tenantRepository.findOne.mockResolvedValue(mockTenant as Tenant);

      // Act & Assert
      await expect(
        service.startOnboarding(validOnboardingDto, '127.0.0.1', 'test-agent')
      ).rejects.toThrow(ConflictException);

      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { name: validOnboardingDto.name },
      });
    });

    it('should throw ConflictException if admin user email already exists', async () => {
      // Arrange
      tenantRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(mockUser as User);

      // Act & Assert
      await expect(
        service.startOnboarding(validOnboardingDto, '127.0.0.1', 'test-agent')
      ).rejects.toThrow(ConflictException);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: validOnboardingDto.adminUser.email },
      });
    });

    it('should throw ConflictException if domain already exists', async () => {
      // Arrange
      const onboardingWithDomain = {
        ...validOnboardingDto,
        domain: 'test.com',
      };
      tenantRepository.findOne
        .mockResolvedValueOnce(null) // First call for name check
        .mockResolvedValueOnce(mockTenant as Tenant); // Second call for domain check

      // Act & Assert
      await expect(
        service.startOnboarding(onboardingWithDomain, '127.0.0.1', 'test-agent')
      ).rejects.toThrow(ConflictException);

      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { domain: onboardingWithDomain.domain },
      });
    });
  });

  describe('verifyOnboarding', () => {
    it('should verify onboarding successfully', async () => {
      // Arrange
      const verificationOnboarding = {
        ...mockOnboarding,
        currentStep: OnboardingStep.VERIFICATION,
        verificationToken: 'valid-token',
        verificationTokenExpiresAt: new Date(Date.now() + 60000), // 1 minute from now
        verifiedAt: undefined,
      };

      onboardingRepository.findOne.mockResolvedValue({
        ...verificationOnboarding,
        verifiedAt: null,
      } as unknown as TenantOnboarding);
      onboardingRepository.save.mockResolvedValue({
        ...verificationOnboarding,
        verifiedAt: null,
      } as unknown as TenantOnboarding);

      const processNextStepSpy = jest
        .spyOn(service as any, 'processNextStep')
        .mockResolvedValue({
          success: true,
          nextStep: OnboardingStep.COMPLETION,
        });

      const verifyDto = {
        onboardingId: '123e4567-e89b-12d3-a456-426614174000',
        verificationToken: 'valid-token',
      };

      // Act
      const result = await service.verifyOnboarding(verifyDto);

      // Assert
      expect(onboardingRepository.findOne).toHaveBeenCalledWith({
        where: { id: verifyDto.onboardingId },
        relations: ['tenant', 'adminUser'],
      });
      expect(onboardingRepository.save).toHaveBeenCalled();
      expect(processNextStepSpy).toHaveBeenCalledWith(
        verificationOnboarding.id
      );
      expect(result.onboardingId).toBe(verifyDto.onboardingId);
    });

    it('should throw BadRequestException if not in verification step', async () => {
      // Arrange
      const nonVerificationOnboarding = {
        ...mockOnboarding,
        currentStep: OnboardingStep.TENANT_SETUP,
      };

      onboardingRepository.findOne.mockResolvedValue(
        nonVerificationOnboarding as TenantOnboarding
      );

      const verifyDto = {
        onboardingId: '123e4567-e89b-12d3-a456-426614174000',
        verificationToken: 'valid-token',
      };

      // Act & Assert
      await expect(service.verifyOnboarding(verifyDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if already verified', async () => {
      // Arrange
      const verifiedOnboarding = {
        ...mockOnboarding,
        currentStep: OnboardingStep.VERIFICATION,
        verifiedAt: new Date(),
      };

      onboardingRepository.findOne.mockResolvedValue(
        verifiedOnboarding as TenantOnboarding
      );

      const verifyDto = {
        onboardingId: '123e4567-e89b-12d3-a456-426614174000',
        verificationToken: 'valid-token',
      };

      // Act & Assert
      await expect(service.verifyOnboarding(verifyDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if token is invalid', async () => {
      // Arrange
      const verificationOnboarding = {
        ...mockOnboarding,
        currentStep: OnboardingStep.VERIFICATION,
        verificationToken: 'different-token',
        verificationTokenExpiresAt: new Date(Date.now() + 60000),
        verifiedAt: undefined,
      };

      onboardingRepository.findOne.mockResolvedValue({
        ...verificationOnboarding,
        verifiedAt: null,
      } as unknown as TenantOnboarding);

      const verifyDto = {
        onboardingId: '123e4567-e89b-12d3-a456-426614174000',
        verificationToken: 'invalid-token',
      };

      // Act & Assert
      await expect(service.verifyOnboarding(verifyDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if token is expired', async () => {
      // Arrange
      const expiredOnboarding = {
        ...mockOnboarding,
        currentStep: OnboardingStep.VERIFICATION,
        verificationToken: 'valid-token',
        verificationTokenExpiresAt: new Date(Date.now() - 60000), // 1 minute ago
        verifiedAt: undefined,
        isVerificationTokenExpired: true,
      };

      onboardingRepository.findOne.mockResolvedValue({
        ...expiredOnboarding,
        verifiedAt: null,
      } as unknown as TenantOnboarding);

      const verifyDto = {
        onboardingId: '123e4567-e89b-12d3-a456-426614174000',
        verificationToken: 'valid-token',
      };

      // Act & Assert
      await expect(service.verifyOnboarding(verifyDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email successfully', async () => {
      // Arrange
      const verificationOnboarding = {
        ...mockOnboarding,
        currentStep: OnboardingStep.VERIFICATION,
        verifiedAt: undefined,
      };

      onboardingRepository.findOne.mockResolvedValue({
        ...verificationOnboarding,
        verifiedAt: null,
      } as unknown as TenantOnboarding);
      onboardingRepository.save.mockResolvedValue({
        ...verificationOnboarding,
        verifiedAt: null,
      } as unknown as TenantOnboarding);
      emailService.sendTenantOnboardingVerificationEmail.mockResolvedValue();

      const resendDto = {
        onboardingId: '123e4567-e89b-12d3-a456-426614174000',
      };

      // Act
      const result = await service.resendVerification(resendDto);

      // Assert
      expect(onboardingRepository.save).toHaveBeenCalled();
      expect(
        emailService.sendTenantOnboardingVerificationEmail
      ).toHaveBeenCalledWith(
        mockOnboarding.onboardingData!.adminUser!.email,
        mockOnboarding.onboardingData!.adminUser!.firstName,
        mockOnboarding.onboardingData!.tenantName!,
        expect.any(String),
        mockOnboarding.id
      );
      expect(result).toEqual({
        message: 'Verification email sent successfully',
      });
    });

    it('should throw BadRequestException if not in verification step', async () => {
      // Arrange
      const nonVerificationOnboarding = {
        ...mockOnboarding,
        currentStep: OnboardingStep.TENANT_SETUP,
      };

      onboardingRepository.findOne.mockResolvedValue(
        nonVerificationOnboarding as TenantOnboarding
      );

      const resendDto = {
        onboardingId: '123e4567-e89b-12d3-a456-426614174000',
      };

      // Act & Assert
      await expect(service.resendVerification(resendDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if already verified', async () => {
      // Arrange
      const verifiedOnboarding = {
        ...mockOnboarding,
        currentStep: OnboardingStep.VERIFICATION,
        verifiedAt: new Date(),
      };

      onboardingRepository.findOne.mockResolvedValue(
        verifiedOnboarding as TenantOnboarding
      );

      const resendDto = {
        onboardingId: '123e4567-e89b-12d3-a456-426614174000',
      };

      // Act & Assert
      await expect(service.resendVerification(resendDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('cancelOnboarding', () => {
    it('should cancel onboarding successfully', async () => {
      // Arrange
      const activeOnboarding = {
        ...mockOnboarding,
        status: OnboardingStatus.IN_PROGRESS,
        tenantId: 'tenant-id',
        adminUserId: 'user-id',
        isCompleted: false,
        isCancelled: false,
        cancel: jest.fn(),
      };

      onboardingRepository.findOne.mockResolvedValue(activeOnboarding as any);

      const mockManager = {
        save: jest.fn(),
        softDelete: jest.fn(),
      };
      dataSource.transaction = jest
        .fn()
        .mockImplementation(async callback => callback(mockManager));

      const cancelDto = {
        onboardingId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'User decided not to proceed',
        cleanup: true,
      };

      // Act
      const result = await service.cancelOnboarding(cancelDto);

      // Assert
      expect(activeOnboarding.cancel).toHaveBeenCalledWith(cancelDto.reason);
      expect(mockManager.save).toHaveBeenCalledWith(
        TenantOnboarding,
        activeOnboarding
      );
      expect(mockManager.softDelete).toHaveBeenCalledWith(User, {
        id: 'user-id',
      });
      expect(mockManager.softDelete).toHaveBeenCalledWith(Tenant, {
        id: 'tenant-id',
      });
      expect(result).toEqual({ message: 'Onboarding cancelled successfully' });
    });

    it('should throw BadRequestException if already completed', async () => {
      // Arrange
      const completedOnboarding = {
        ...mockOnboarding,
        status: OnboardingStatus.COMPLETED,
        isCompleted: true,
        isCancelled: false,
      };

      onboardingRepository.findOne.mockResolvedValue(
        completedOnboarding as any
      );

      const cancelDto = {
        onboardingId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'User decided not to proceed',
      };

      // Act & Assert
      await expect(service.cancelOnboarding(cancelDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if already cancelled', async () => {
      // Arrange
      const cancelledOnboarding = {
        ...mockOnboarding,
        status: OnboardingStatus.CANCELLED,
        isCompleted: false,
        isCancelled: true,
      };

      onboardingRepository.findOne.mockResolvedValue(
        cancelledOnboarding as any
      );

      const cancelDto = {
        onboardingId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'User decided not to proceed',
      };

      // Act & Assert
      await expect(service.cancelOnboarding(cancelDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getOnboardingProgress', () => {
    it('should return onboarding progress successfully', async () => {
      // Arrange
      const progressOnboarding = {
        ...mockOnboarding,
        completedSteps: [OnboardingStep.TENANT_SETUP],
        progressPercentage: 14,
        tenantId: 'tenant-id',
        adminUserId: 'user-id',
        estimatedCompletion: new Date(),
        nextAction: 'Creating admin user account...',
      };

      onboardingRepository.findOne.mockResolvedValue(
        progressOnboarding as TenantOnboarding
      );

      // Act
      const result = await service.getOnboardingProgress(
        '123e4567-e89b-12d3-a456-426614174000'
      );

      // Assert
      expect(result).toEqual({
        onboardingId: progressOnboarding.id,
        currentStep: progressOnboarding.currentStep,
        status: progressOnboarding.status,
        completedSteps: progressOnboarding.completedSteps,
        progressPercentage: progressOnboarding.progressPercentage,
        tenantId: progressOnboarding.tenantId,
        adminUserId: progressOnboarding.adminUserId,
        estimatedCompletion: progressOnboarding.estimatedCompletion,
        nextAction: progressOnboarding.nextAction,
      });
    });

    it('should throw NotFoundException if onboarding not found', async () => {
      // Arrange
      onboardingRepository.findOne.mockResolvedValue(null);
      const validUuid = '123e4567-e89b-12d3-a456-426614174999';

      // Act & Assert
      await expect(service.getOnboardingProgress(validUuid)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException for invalid UUID format', async () => {
      // Act & Assert
      await expect(
        service.getOnboardingProgress('invalid-uuid')
      ).rejects.toThrow(BadRequestException);
    });
  });
});
