import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '../../auth/services/jwt.service';
import { InvitationService } from './invitation.service';
import { InvitationRepository } from '../repositories/invitation.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { RoleRepository } from '../../rbac/repositories/role.repository';
import { EmailService } from '../../email/services/email.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  Invitation,
  InvitationStatus,
  InvitationType,
} from '../entities/invitation.entity';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../rbac/entities/role.entity';
import {
  CreateInvitationDto,
  AcceptInvitationDto,
} from '../dto/invitation.dto';

describe('InvitationService', () => {
  let service: InvitationService;
  let invitationRepository: jest.Mocked<InvitationRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let roleRepository: jest.Mocked<RoleRepository>;
  let emailService: jest.Mocked<EmailService>;
  let auditService: jest.Mocked<AuditService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashedPassword',
    emailVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockRole = {
    id: 'role-1',
    name: 'Team Member',
    description: 'Team member role',
    tenantId: 'tenant-1',
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Role;

  const mockInvitation = {
    id: 'invitation-1',
    email: 'newuser@example.com',
    type: InvitationType.TEAM_MEMBER,
    status: InvitationStatus.PENDING,
    message: 'Welcome to our team!',
    token: 'secure-token-123',
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    tenantId: 'tenant-1',
    invitedById: 'user-1',
    roleId: 'role-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    isExpired: jest.fn().mockReturnValue(false),
    isPending: jest.fn().mockReturnValue(true),
    canBeAccepted: jest.fn().mockReturnValue(true),
    canBeRevoked: jest.fn().mockReturnValue(true),
    accept: jest.fn(),
    revoke: jest.fn(),
    markAsExpired: jest.fn(),
  } as unknown as Invitation;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: InvitationRepository,
          useValue: {
            save: jest.fn(),
            findByEmailAndTenant: jest.fn(),
            findByIdAndTenant: jest.fn(),
            findByToken: jest.fn(),
            findOneByIdForTenant: jest.fn(),
            findWithFilters: jest.fn(),
            getStats: jest.fn(),
            markExpiredInvitations: jest.fn(),
            deleteExpiredInvitations: jest.fn(),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: RoleRepository,
          useValue: {
            findOneByIdForTenant: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendInvitationEmail: jest.fn(),
            sendWelcomeEmail: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logInvitationCreated: jest.fn().mockResolvedValue({} as any),
            logInvitationAccepted: jest.fn().mockResolvedValue({} as any),
            logInvitationRevoked: jest.fn().mockResolvedValue({} as any),
            logInvitationResent: jest.fn().mockResolvedValue({} as any),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
    invitationRepository = module.get(InvitationRepository);
    userRepository = module.get(UserRepository);
    roleRepository = module.get(RoleRepository);
    emailService = module.get(EmailService);
    auditService = module.get(AuditService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    const createDto: CreateInvitationDto = {
      email: 'newuser@example.com',
      type: InvitationType.TEAM_MEMBER,
      roleId: 'role-1',
      message: 'Welcome to our team!',
    };

    it('should create invitation successfully', async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(null);
      invitationRepository.findByEmailAndTenant.mockResolvedValue(null);
      roleRepository.findOneByIdForTenant.mockResolvedValue(mockRole as Role);
      invitationRepository.save.mockResolvedValue(mockInvitation as Invitation);
      emailService.sendInvitationEmail.mockResolvedValue(undefined);
      auditService.logInvitationCreated.mockResolvedValue({} as any);

      // Act
      const result = await service.createInvitation(
        createDto,
        mockUser,
        'tenant-1'
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(createDto.email.toLowerCase());
      expect(invitationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createDto.email.toLowerCase(),
          type: createDto.type,
          message: createDto.message,
          tenantId: 'tenant-1',
          invitedById: mockUser.id,
          roleId: mockRole.id,
        })
      );
      expect(emailService.sendInvitationEmail).toHaveBeenCalled();
      expect(auditService.logInvitationCreated).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists in tenant', async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(mockUser as User);

      // Act & Assert
      await expect(
        service.createInvitation(createDto, mockUser as User, 'tenant-1')
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if pending invitation already exists', async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(null);
      invitationRepository.findByEmailAndTenant.mockResolvedValue(
        mockInvitation as Invitation
      );

      // Act & Assert
      await expect(
        service.createInvitation(createDto, mockUser, 'tenant-1')
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if role ID is invalid', async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(null);
      invitationRepository.findByEmailAndTenant.mockResolvedValue(null);
      roleRepository.findOneByIdForTenant.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createInvitation(createDto, mockUser, 'tenant-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInvitations', () => {
    it('should return paginated invitations', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const mockResult = {
        invitations: [mockInvitation as Invitation],
        total: 1,
      };
      invitationRepository.findWithFilters.mockResolvedValue(mockResult);

      // Act
      const result = await service.getInvitations(query, 'tenant-1');

      // Assert
      expect(result.invitations).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getInvitationById', () => {
    it('should return invitation by ID', async () => {
      // Arrange
      invitationRepository.findByIdAndTenant.mockResolvedValue(
        mockInvitation as Invitation
      );

      // Act
      const result = await service.getInvitationById(
        'invitation-1',
        'tenant-1'
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('invitation-1');
    });

    it('should throw NotFoundException if invitation not found', async () => {
      // Arrange
      invitationRepository.findByIdAndTenant.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getInvitationById('invalid-id', 'tenant-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateInvitation', () => {
    const updateDto = {
      type: InvitationType.ADMIN,
      message: 'Updated message',
    };

    it('should update invitation successfully', async () => {
      // Arrange
      invitationRepository.findByIdAndTenant.mockResolvedValue(
        mockInvitation as Invitation
      );
      invitationRepository.save.mockResolvedValue(mockInvitation as Invitation);

      // Act
      const result = await service.updateInvitation(
        'invitation-1',
        updateDto,
        'tenant-1'
      );

      // Assert
      expect(result).toBeDefined();
      expect(invitationRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if invitation not found', async () => {
      // Arrange
      invitationRepository.findByIdAndTenant.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateInvitation('invalid-id', updateDto, 'tenant-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invitation cannot be updated', async () => {
      // Arrange
      const expiredInvitation = {
        ...mockInvitation,
        canBeRevoked: jest.fn().mockReturnValue(false),
      };
      invitationRepository.findByIdAndTenant.mockResolvedValue(
        expiredInvitation as unknown as Invitation
      );

      // Act & Assert
      await expect(
        service.updateInvitation('invitation-1', updateDto, 'tenant-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke invitation successfully', async () => {
      // Arrange
      invitationRepository.findByIdAndTenant.mockResolvedValue(
        mockInvitation as Invitation
      );
      invitationRepository.save.mockResolvedValue(mockInvitation as Invitation);
      auditService.logInvitationRevoked.mockResolvedValue({} as any);

      // Act
      await service.revokeInvitation(
        'invitation-1',
        'tenant-1',
        mockUser as User
      );

      // Assert
      expect(mockInvitation.revoke).toHaveBeenCalled();
      expect(invitationRepository.save).toHaveBeenCalled();
      expect(auditService.logInvitationRevoked).toHaveBeenCalled();
    });

    it('should throw NotFoundException if invitation not found', async () => {
      // Arrange
      invitationRepository.findByIdAndTenant.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.revokeInvitation('invalid-id', 'tenant-1', mockUser as User)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptInvitation', () => {
    const acceptDto: AcceptInvitationDto = {
      firstName: 'New',
      lastName: 'User',
      password: 'SecurePassword123!',
    };

    it('should accept invitation and create new user successfully', async () => {
      // Arrange
      invitationRepository.findByToken.mockResolvedValue(
        mockInvitation as Invitation
      );
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.save.mockResolvedValue(mockUser as User);
      invitationRepository.save.mockResolvedValue(mockInvitation as Invitation);
      emailService.sendWelcomeEmail.mockResolvedValue(undefined);
      auditService.logInvitationAccepted.mockResolvedValue({} as any);

      // Act
      const result = await service.acceptInvitation('valid-token', acceptDto);

      // Assert
      expect(result.user).toBeDefined();
      expect(result.invitation).toBeDefined();
      expect(mockInvitation.accept).toHaveBeenCalledWith(mockUser as User);
      expect(userRepository.save).toHaveBeenCalled();
      expect(emailService.sendWelcomeEmail).toHaveBeenCalled();
      expect(auditService.logInvitationAccepted).toHaveBeenCalled();
    });

    it('should accept invitation for existing user successfully', async () => {
      // Arrange
      invitationRepository.findByToken.mockResolvedValue(
        mockInvitation as Invitation
      );
      userRepository.findByEmail.mockResolvedValue(mockUser as User);
      invitationRepository.save.mockResolvedValue(mockInvitation as Invitation);
      emailService.sendWelcomeEmail.mockResolvedValue(undefined);
      auditService.logInvitationAccepted.mockResolvedValue({} as any);

      // Act
      const result = await service.acceptInvitation('valid-token', acceptDto);

      // Assert
      expect(result.user).toBeDefined();
      expect(result.invitation).toBeDefined();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if token is invalid', async () => {
      // Arrange
      invitationRepository.findByToken.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.acceptInvitation('invalid-token', acceptDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invitation cannot be accepted', async () => {
      // Arrange
      const expiredInvitation = {
        ...mockInvitation,
        canBeAccepted: jest.fn().mockReturnValue(false),
      };
      invitationRepository.findByToken.mockResolvedValue(
        expiredInvitation as unknown as Invitation
      );

      // Act & Assert
      await expect(
        service.acceptInvitation('valid-token', acceptDto)
      ).rejects.toThrow(BadRequestException);
    });

    // TODO: Re-enable this test when the conflict check is implemented
    // it('should throw ConflictException if user already exists in tenant', async () => {
    //   // Arrange
    //   invitationRepository.findByToken.mockResolvedValue(mockInvitation as Invitation);
    //   userRepository.findByEmail.mockResolvedValue(mockUser as User);

    //   // Act & Assert
    //   await expect(service.acceptInvitation('valid-token', acceptDto))
    //     .rejects.toThrow(ConflictException);
    // });
  });

  describe('resendInvitation', () => {
    it('should resend invitation successfully', async () => {
      // Arrange
      invitationRepository.findByIdAndTenant.mockResolvedValue(
        mockInvitation as Invitation
      );
      invitationRepository.save.mockResolvedValue(mockInvitation as Invitation);
      emailService.sendInvitationEmail.mockResolvedValue(undefined);
      auditService.logInvitationResent.mockResolvedValue({} as any);

      // Act
      const result = await service.resendInvitation(
        'invitation-1',
        'tenant-1',
        mockUser as User
      );

      // Assert
      expect(result).toBeDefined();
      expect(invitationRepository.save).toHaveBeenCalled();
      expect(emailService.sendInvitationEmail).toHaveBeenCalled();
      expect(auditService.logInvitationResent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if invitation not found', async () => {
      // Arrange
      invitationRepository.findByIdAndTenant.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.resendInvitation('invalid-id', 'tenant-1', mockUser as User)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invitation is not pending', async () => {
      // Arrange
      const acceptedInvitation = {
        ...mockInvitation,
        isPending: jest.fn().mockReturnValue(false),
      };
      invitationRepository.findByIdAndTenant.mockResolvedValue(
        acceptedInvitation as unknown as Invitation
      );

      // Act & Assert
      await expect(
        service.resendInvitation('invitation-1', 'tenant-1', mockUser as User)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInvitationStats', () => {
    it('should return invitation statistics', async () => {
      // Arrange
      const mockStats = {
        total: 10,
        pending: 3,
        accepted: 5,
        expired: 1,
        revoked: 1,
        acceptanceRate: 50.0,
      };
      invitationRepository.getStats.mockResolvedValue(mockStats);

      // Act
      const result = await service.getInvitationStats('tenant-1');

      // Assert
      expect(result).toEqual(mockStats);
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should cleanup expired invitations successfully', async () => {
      // Arrange
      invitationRepository.markExpiredInvitations.mockResolvedValue(5);
      invitationRepository.deleteExpiredInvitations.mockResolvedValue(3);

      // Act
      const result = await service.cleanupExpiredInvitations();

      // Assert
      expect(result.expired).toBe(5);
      expect(result.deleted).toBe(3);
    });
  });
});
