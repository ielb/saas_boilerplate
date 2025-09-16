import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { UserLifecycleService } from './user-lifecycle.service';
import { EmailService } from '../../email/services/email.service';
import { AuditService } from '../../audit/services/audit.service';
import { User } from '../entities/user.entity';
import { UserRole, UserStatus } from '@app/shared';
import { AuditEventType } from '../../audit/entities/audit-log.entity';

describe('UserLifecycleService', () => {
  let service: UserLifecycleService;
  let userRepository: Repository<User>;
  let emailService: EmailService;
  let auditService: AuditService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockEmailService = {
    sendEmailVerification: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendUserActivationNotification: jest.fn(),
    sendUserSuspensionNotification: jest.fn(),
    sendUserReactivationNotification: jest.fn(),
    sendUserDeletionNotification: jest.fn(),
  };

  const mockAuditService = {
    logEvent: jest.fn(),
  };

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.MEMBER,
    status: UserStatus.PENDING,
    tenantId: 'tenant-123',
    emailVerified: false,
    generateEmailVerificationToken: jest.fn(),
    markEmailAsVerified: jest.fn().mockImplementation(() => {
      const user = mockUser as any;
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
    }),
    metadata: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserLifecycleService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<UserLifecycleService>(UserLifecycleService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    emailService = module.get<EmailService>(EmailService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'Jane',
      lastName: 'Smith',
      tenantId: 'tenant-123',
      role: UserRole.MEMBER,
    };

    it('should register a new user successfully', async () => {
      // Arrange
      const expectedUser = { ...mockUser, ...registerData };
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(expectedUser);
      mockUserRepository.save.mockResolvedValue(expectedUser);
      mockEmailService.sendEmailVerification.mockResolvedValue(undefined);
      mockAuditService.logEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.registerUser(registerData);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerData.email, tenantId: registerData.tenantId },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...registerData,
        status: UserStatus.PENDING,
        emailVerified: false,
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(expectedUser);
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalledWith(
        expectedUser
      );
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        eventType: AuditEventType.USER_REGISTERED,
        userId: expectedUser.id,
        tenantId: expectedUser.tenantId,
        userEmail: expectedUser.email,
        metadata: {
          email: expectedUser.email,
          role: expectedUser.role,
          status: expectedUser.status,
        },
      });
    });

    it('should throw BadRequestException if user already exists', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.registerUser(registerData)).rejects.toThrow(
        new BadRequestException('User already exists with this email')
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerData.email, tenantId: registerData.tenantId },
      });
    });

    it('should throw BadRequestException if email is missing', async () => {
      // Arrange
      const invalidData: any = { ...registerData };
      delete invalidData.email;

      // Act & Assert
      await expect(service.registerUser(invalidData)).rejects.toThrow(
        new BadRequestException('Email is required')
      );
    });

    it('should throw BadRequestException if firstName is missing', async () => {
      // Arrange
      const invalidData: any = { ...registerData };
      delete invalidData.firstName;

      // Act & Assert
      await expect(service.registerUser(invalidData)).rejects.toThrow(
        new BadRequestException('First name is required')
      );
    });

    it('should throw BadRequestException if lastName is missing', async () => {
      // Arrange
      const invalidData: any = { ...registerData };
      delete invalidData.lastName;

      // Act & Assert
      await expect(service.registerUser(invalidData)).rejects.toThrow(
        new BadRequestException('Last name is required')
      );
    });

    it('should throw BadRequestException if tenantId is missing', async () => {
      // Arrange
      const invalidData: any = { ...registerData };
      delete invalidData.tenantId;

      // Act & Assert
      await expect(service.registerUser(invalidData)).rejects.toThrow(
        new BadRequestException('Tenant ID is required')
      );
    });

    it('should not send email verification if disabled', async () => {
      // Arrange
      const expectedUser = { ...mockUser, ...registerData };
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(expectedUser);
      mockUserRepository.save.mockResolvedValue(expectedUser);
      mockAuditService.logEvent.mockResolvedValue(undefined);

      // Act
      await service.registerUser(registerData, {
        sendEmailVerification: false,
      });

      // Assert
      expect(mockEmailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should send welcome email if enabled', async () => {
      // Arrange
      const expectedUser = { ...mockUser, ...registerData };
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(expectedUser);
      mockUserRepository.save.mockResolvedValue(expectedUser);
      mockEmailService.sendEmailVerification.mockResolvedValue(undefined);
      mockEmailService.sendWelcomeEmail.mockResolvedValue(undefined);
      mockAuditService.logEvent.mockResolvedValue(undefined);

      // Act
      await service.registerUser(registerData, { sendWelcomeEmail: true });

      // Assert
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        expectedUser
      );
    });
  });

  describe('activateUser', () => {
    const userId = 'user-123';
    const pendingUser = { ...mockUser, status: UserStatus.PENDING };

    it('should activate a pending user successfully', async () => {
      // Arrange
      const pendingUserCopy = {
        ...pendingUser,
        markEmailAsVerified: jest.fn().mockImplementation(() => {
          pendingUserCopy.emailVerified = true;
          pendingUserCopy.emailVerifiedAt = new Date();
        }),
      };
      mockUserRepository.findOne.mockResolvedValue(pendingUserCopy);
      mockUserRepository.save.mockImplementation(user => {
        const savedUser = { ...user, status: UserStatus.ACTIVE };
        return Promise.resolve(savedUser);
      });
      mockEmailService.sendUserActivationNotification.mockResolvedValue(
        undefined
      );
      mockAuditService.logEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.activateUser(userId);

      // Assert
      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.ACTIVE,
        })
      );
      expect(
        mockEmailService.sendUserActivationNotification
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.ACTIVE,
          emailVerified: true,
        })
      );
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        eventType: AuditEventType.USER_ACTIVATED,
        userId: pendingUser.id,
        tenantId: pendingUser.tenantId,
        userEmail: pendingUser.email,
        metadata: {
          previousStatus: pendingUser.status,
          newStatus: UserStatus.ACTIVE,
          emailVerified: true,
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.activateUser(userId)).rejects.toThrow(
        new NotFoundException(`User with ID ${userId} not found`)
      );
    });

    it('should throw BadRequestException if user is already active', async () => {
      // Arrange
      const activeUser = { ...mockUser, status: UserStatus.ACTIVE };
      mockUserRepository.findOne.mockResolvedValue(activeUser);

      // Act & Assert
      await expect(service.activateUser(userId)).rejects.toThrow(
        new BadRequestException('User is already active')
      );
    });

    it('should throw BadRequestException if user is deleted', async () => {
      // Arrange
      const deletedUser = { ...mockUser, status: UserStatus.DELETED };
      mockUserRepository.findOne.mockResolvedValue(deletedUser);

      // Act & Assert
      await expect(service.activateUser(userId)).rejects.toThrow(
        new BadRequestException('Cannot activate a deleted user')
      );
    });

    it('should skip email verification if option is set', async () => {
      // Arrange
      const pendingUserCopy = { ...pendingUser };
      const activatedUser = {
        ...pendingUser,
        status: UserStatus.ACTIVE,
        emailVerified: false,
      };
      mockUserRepository.findOne.mockResolvedValue(pendingUserCopy);
      mockUserRepository.save.mockResolvedValue(activatedUser);
      mockEmailService.sendUserActivationNotification.mockResolvedValue(
        undefined
      );
      mockAuditService.logEvent.mockResolvedValue(undefined);

      // Act
      await service.activateUser(userId, { skipEmailVerification: true });

      // Assert
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.ACTIVE,
          emailVerified: false,
        })
      );
    });
  });

  describe('suspendUser', () => {
    const userId = 'user-123';
    const activeUser = { ...mockUser, status: UserStatus.ACTIVE };

    it('should suspend an active user successfully', async () => {
      // Arrange
      const activeUserCopy = { ...activeUser };
      const suspendedUser = {
        ...activeUser,
        status: UserStatus.SUSPENDED,
        metadata: {
          suspendedAt: new Date(),
          suspensionReason: 'Test suspension',
          suspensionExpiresAt: null,
        },
      };
      mockUserRepository.findOne.mockResolvedValue(activeUserCopy);
      mockUserRepository.save.mockResolvedValue(suspendedUser);
      mockEmailService.sendUserSuspensionNotification.mockResolvedValue(
        undefined
      );
      mockAuditService.logEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.suspendUser(userId, {
        reason: 'Test suspension',
      });

      // Assert
      expect(result).toEqual(suspendedUser);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.SUSPENDED,
          metadata: expect.objectContaining({
            suspendedAt: expect.any(Date),
            suspensionReason: 'Test suspension',
            suspensionExpiresAt: null,
          }),
        })
      );
      const emailCall =
        mockEmailService.sendUserSuspensionNotification.mock.calls[0];
      expect(emailCall[0]).toMatchObject({
        ...suspendedUser,
        metadata: expect.objectContaining({
          suspendedAt: expect.any(Date),
          suspensionReason: 'Test suspension',
          suspensionExpiresAt: null,
        }),
      });
      expect(emailCall[1]).toMatchObject({
        suspendedAt: expect.any(Date),
        suspensionReason: 'Test suspension',
      });
    });

    it('should throw BadRequestException if user is already suspended', async () => {
      // Arrange
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      mockUserRepository.findOne.mockResolvedValue(suspendedUser);

      // Act & Assert
      await expect(service.suspendUser(userId)).rejects.toThrow(
        new BadRequestException('User is already suspended')
      );
    });

    it('should throw BadRequestException if user is deleted', async () => {
      // Arrange
      const deletedUser = { ...mockUser, status: UserStatus.DELETED };
      mockUserRepository.findOne.mockResolvedValue(deletedUser);

      // Act & Assert
      await expect(service.suspendUser(userId)).rejects.toThrow(
        new BadRequestException('Cannot suspend a deleted user')
      );
    });

    it('should throw BadRequestException if user is owner', async () => {
      // Arrange
      const ownerUser = {
        ...mockUser,
        status: UserStatus.ACTIVE,
        role: UserRole.OWNER,
      };
      mockUserRepository.findOne.mockResolvedValue(ownerUser);

      // Act & Assert
      await expect(service.suspendUser(userId)).rejects.toThrow(
        new BadRequestException('Cannot suspend tenant owner')
      );
    });

    it('should set suspension duration correctly', async () => {
      // Arrange
      const activeUserCopy = { ...activeUser };
      const suspendedUser = {
        ...activeUser,
        status: UserStatus.SUSPENDED,
        metadata: {
          suspendedAt: new Date(),
          suspensionReason: 'Test',
          suspensionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      };
      mockUserRepository.findOne.mockResolvedValue(activeUserCopy);
      mockUserRepository.save.mockResolvedValue(suspendedUser);
      mockEmailService.sendUserSuspensionNotification.mockResolvedValue(
        undefined
      );
      mockAuditService.logEvent.mockResolvedValue(undefined);

      // Act
      await service.suspendUser(userId, { reason: 'Test', duration: 30 });

      // Assert
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            suspensionExpiresAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('reactivateUser', () => {
    const userId = 'user-123';
    const suspendedUser = {
      ...mockUser,
      status: UserStatus.SUSPENDED,
      metadata: {
        suspendedAt: new Date(),
        suspensionReason: 'Test suspension',
        suspensionExpiresAt: new Date(),
      },
    };

    it('should reactivate a suspended user successfully', async () => {
      // Arrange
      const suspendedUserCopy = { ...suspendedUser };
      const reactivatedUser = {
        ...suspendedUser,
        status: UserStatus.ACTIVE,
        metadata: {
          suspendedAt: null,
          suspensionReason: null,
          suspensionExpiresAt: null,
        },
      };
      mockUserRepository.findOne.mockResolvedValue(suspendedUserCopy);
      mockUserRepository.save.mockResolvedValue(reactivatedUser);
      mockEmailService.sendUserReactivationNotification.mockResolvedValue(
        undefined
      );
      mockAuditService.logEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.reactivateUser(userId);

      // Assert
      expect(result).toEqual(reactivatedUser);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.ACTIVE,
          metadata: expect.objectContaining({
            suspendedAt: null,
            suspensionReason: null,
            suspensionExpiresAt: null,
          }),
        })
      );
      expect(
        mockEmailService.sendUserReactivationNotification
      ).toHaveBeenCalledWith(reactivatedUser);
    });

    it('should throw BadRequestException if user is not suspended', async () => {
      // Arrange
      const activeUser = { ...mockUser, status: UserStatus.ACTIVE };
      mockUserRepository.findOne.mockResolvedValue(activeUser);

      // Act & Assert
      await expect(service.reactivateUser(userId)).rejects.toThrow(
        new BadRequestException('User is not suspended')
      );
    });
  });

  describe('deleteUser', () => {
    const userId = 'user-123';
    const activeUser = { ...mockUser, status: UserStatus.ACTIVE };

    it('should delete a user successfully', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(activeUser);
      mockUserRepository.softDelete.mockResolvedValue({ affected: 1 });
      mockEmailService.sendUserDeletionNotification.mockResolvedValue(
        undefined
      );
      mockAuditService.logEvent.mockResolvedValue(undefined);

      // Act
      await service.deleteUser(userId);

      // Assert
      expect(mockUserRepository.softDelete).toHaveBeenCalledWith(userId);
      expect(
        mockEmailService.sendUserDeletionNotification
      ).toHaveBeenCalledWith(activeUser);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        eventType: AuditEventType.USER_DELETED,
        userId: activeUser.id,
        tenantId: activeUser.tenantId,
        userEmail: activeUser.email,
        metadata: {
          previousStatus: activeUser.status,
          email: activeUser.email,
          role: activeUser.role,
        },
      });
    });

    it('should throw BadRequestException if user is owner', async () => {
      // Arrange
      const ownerUser = {
        ...mockUser,
        status: UserStatus.ACTIVE,
        role: UserRole.OWNER,
      };
      mockUserRepository.findOne.mockResolvedValue(ownerUser);

      // Act & Assert
      await expect(service.deleteUser(userId)).rejects.toThrow(
        new BadRequestException('Cannot delete tenant owner')
      );
    });
  });

  describe('getUserLifecycleInfo', () => {
    const userId = 'user-123';

    it('should return lifecycle info for active user', async () => {
      // Arrange
      const activeUser = { ...mockUser, status: UserStatus.ACTIVE };
      mockUserRepository.findOne.mockResolvedValue(activeUser);

      // Act
      const result = await service.getUserLifecycleInfo(userId);

      // Assert
      expect(result.user).toEqual(activeUser);
      expect(result.isActive).toBe(true);
      expect(result.isSuspended).toBe(false);
      expect(result.isDeleted).toBe(false);
      expect(result.suspensionInfo).toBeUndefined();
    });

    it('should return lifecycle info for suspended user with suspension details', async () => {
      // Arrange
      const suspendedUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED,
        metadata: {
          suspendedAt: new Date('2023-01-01'),
          suspensionReason: 'Test suspension',
          suspensionExpiresAt: new Date('2023-02-01'),
        },
      };
      mockUserRepository.findOne.mockResolvedValue(suspendedUser);

      // Act
      const result = await service.getUserLifecycleInfo(userId);

      // Assert
      expect(result.user).toEqual(suspendedUser);
      expect(result.isActive).toBe(false);
      expect(result.isSuspended).toBe(true);
      expect(result.isDeleted).toBe(false);
      expect(result.suspensionInfo).toEqual({
        suspendedAt: new Date('2023-01-01'),
        reason: 'Test suspension',
        expiresAt: new Date('2023-02-01'),
        isExpired: true,
      });
    });
  });

  describe('checkAndReactivateExpiredSuspensions', () => {
    it('should reactivate expired suspensions', async () => {
      // Arrange
      const expiredSuspendedUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED,
        metadata: {
          suspensionExpiresAt: new Date('2023-01-01'), // Past date
        },
      };
      mockUserRepository.find.mockResolvedValue([expiredSuspendedUser]);
      mockUserRepository.save.mockResolvedValue(expiredSuspendedUser);
      mockEmailService.sendUserReactivationNotification.mockResolvedValue(
        undefined
      );
      mockAuditService.logEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.checkAndReactivateExpiredSuspensions();

      // Assert
      expect(result).toBe(1);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { status: UserStatus.SUSPENDED },
      });
    });

    it('should return 0 if no expired suspensions', async () => {
      // Arrange
      // Return empty array since no expired suspensions are found
      mockUserRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.checkAndReactivateExpiredSuspensions();

      // Assert
      expect(result).toBe(0);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: {
          status: UserStatus.SUSPENDED,
        },
      });
    });
  });
});
