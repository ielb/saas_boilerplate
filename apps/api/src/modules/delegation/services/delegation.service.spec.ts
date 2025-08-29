import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { DelegationService } from './delegation.service';
import {
  Delegation,
  DelegationStatus,
  DelegationType,
  DelegationRepository,
  DelegationAuditLog,
} from '../entities/delegation.entity';
import { User } from '../../users/entities/user.entity';
import { Permission } from '../../rbac/entities/permission.entity';
import { EmailService } from '../../email/services/email.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  CreateDelegationDto,
  ApproveDelegationDto,
  RejectDelegationDto,
  RevokeDelegationDto,
  ActivateDelegationDto,
} from '../dto/delegation.dto';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('DelegationService', () => {
  let service: DelegationService;
  let delegationRepository: jest.Mocked<DelegationRepository>;
  let auditLogRepository: jest.Mocked<Repository<DelegationAuditLog>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let permissionRepository: jest.Mocked<Repository<Permission>>;
  let dataSource: jest.Mocked<DataSource>;
  let emailService: jest.Mocked<EmailService>;
  let auditService: jest.Mocked<AuditService>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'member' as any,
    status: 'active' as any,
    tenantId: 'tenant-1',
    authProvider: 'local' as any,
    emailVerified: true,
    twoFactorEnabled: false,
    twoFactorVerified: false,
    twoFactorAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    fullName: 'Test User',
    verifyPassword: jest.fn(),
    hashPassword: jest.fn(),
    roles: [],
    tenantMemberships: [],
    isActive: jest.fn().mockReturnValue(true),
    isAdmin: jest.fn().mockReturnValue(false),
    isOwner: jest.fn().mockReturnValue(false),
    isCoOwner: jest.fn().mockReturnValue(false),
    isManager: jest.fn().mockReturnValue(false),
    isMember: jest.fn().mockReturnValue(true),
    isGuest: jest.fn().mockReturnValue(false),
    isSuspended: jest.fn().mockReturnValue(false),
    isDeleted: jest.fn().mockReturnValue(false),
    isEmailVerified: jest.fn().mockReturnValue(true),
    isTwoFactorEnabled: jest.fn().mockReturnValue(false),
    isTwoFactorVerified: jest.fn().mockReturnValue(false),
    getFullName: jest.fn().mockReturnValue('Test User'),
    hasRole: jest.fn().mockReturnValue(false),
    hasPermission: jest.fn().mockReturnValue(false),
  } as any;

  const mockDelegate: User = {
    ...mockUser,
    id: 'user-2',
    email: 'delegate@example.com',
    firstName: 'Delegate',
    lastName: 'User',
    fullName: 'Delegate User',
    getFullName: jest.fn().mockReturnValue('Delegate User'),
  } as any;

  const mockPermission: Permission = {
    id: 'permission-1',
    name: 'users:read',
    resource: 'users' as any,
    action: 'read' as any,
    scope: 'tenant' as any,
    isSystem: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [],
    userMemberships: [],
    getFullName: jest.fn().mockReturnValue('users:read'),
    isGlobal: jest.fn().mockReturnValue(false),
    isTenantScoped: jest.fn().mockReturnValue(true),
    isTeamScoped: jest.fn().mockReturnValue(false),
    isUserScoped: jest.fn().mockReturnValue(false),
    matches: jest.fn(),
    hasCondition: jest.fn(),
    getCondition: jest.fn(),
  };

  const mockDelegation: Delegation = {
    id: 'delegation-1',
    tenantId: 'tenant-1',
    delegatorId: 'user-1',
    delegateId: 'user-2',
    title: 'Test Delegation',
    description: 'Test description',
    delegationType: DelegationType.PERMISSION_BASED,
    status: DelegationStatus.PENDING,
    requestedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    requiresApproval: true,
    isEmergency: false,
    isRecurring: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    permissions: [mockPermission],
    auditLogs: [],
    delegator: mockUser,
    delegate: mockDelegate,
    isActive: jest.fn().mockReturnValue(false),
    isExpired: jest.fn().mockReturnValue(false),
    isPending: jest.fn().mockReturnValue(true),
    isApproved: jest.fn().mockReturnValue(false),
    isRejected: jest.fn().mockReturnValue(false),
    isRevoked: jest.fn().mockReturnValue(false),
    canBeActivated: jest.fn().mockReturnValue(false),
    canBeRevoked: jest.fn().mockReturnValue(true),
    getDurationInHours: jest.fn().mockReturnValue(24),
    getRemainingTimeInHours: jest.fn().mockReturnValue(23),
    hasPermission: jest.fn().mockReturnValue(true),
    getPermissionNames: jest.fn().mockReturnValue(['users:read']),
  };

  beforeEach(async () => {
    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn().mockResolvedValue(mockDelegation),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DelegationService,
        {
          provide: getRepositoryToken(Delegation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
            findOneWithTenantScope: jest.fn(),
            saveWithTenantScope: jest.fn(),
            findActiveDelegationsForUser: jest.fn(),
            findPendingApprovalsForUser: jest.fn(),
            findExpiredDelegations: jest.fn(),
            findDelegationsByDelegator: jest.fn(),
            findDelegationsByDelegate: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DelegationAuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: {
            findByIds: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendDelegationNotification: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DelegationService>(DelegationService);
    delegationRepository = module.get(getRepositoryToken(Delegation));
    auditLogRepository = module.get(getRepositoryToken(DelegationAuditLog));
    userRepository = module.get(getRepositoryToken(User));
    permissionRepository = module.get(getRepositoryToken(Permission));
    dataSource = module.get(DataSource);
    emailService = module.get(EmailService);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDelegation', () => {
    const createDelegationDto: CreateDelegationDto = {
      delegateId: 'user-2',
      title: 'Test Delegation',
      description: 'Test description',
      delegationType: DelegationType.PERMISSION_BASED,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      permissionIds: ['permission-1'],
      requiresApproval: true,
    };

    it('should create a delegation successfully', async () => {
      // Arrange
      userRepository.findOne
        .mockResolvedValueOnce(mockDelegate) // delegate
        .mockResolvedValueOnce(mockUser); // delegator

      permissionRepository.findByIds.mockResolvedValue([mockPermission]);

      // The mockQueryRunner is already set up in beforeEach
      // No need to create a new one here

      delegationRepository.create.mockReturnValue(mockDelegation);
      auditLogRepository.create.mockReturnValue({} as any);
      auditLogRepository.save.mockResolvedValue({} as any);

      // Act
      const result = await service.createDelegation(
        createDelegationDto,
        'user-1',
        'tenant-1'
      );

      // Assert
      expect(result).toBeDefined();
      expect(userRepository.findOne).toHaveBeenCalledTimes(2);
      expect(permissionRepository.findByIds).toHaveBeenCalledWith([
        'permission-1',
      ]);
      expect(dataSource.createQueryRunner).toHaveBeenCalled();
    });

    it('should throw NotFoundException when delegate not found', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createDelegation(createDelegationDto, 'user-1', 'tenant-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when expiration date is in the past', async () => {
      // Arrange
      const pastDateDto = {
        ...createDelegationDto,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      };

      userRepository.findOne
        .mockResolvedValueOnce(mockDelegate)
        .mockResolvedValueOnce(mockUser);

      permissionRepository.findByIds.mockResolvedValue([mockPermission]);

      // Act & Assert
      await expect(
        service.createDelegation(pastDateDto, 'user-1', 'tenant-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveDelegation', () => {
    const approveDto: ApproveDelegationDto = {
      approvalNotes: 'Approved for testing',
    };

    it('should approve a delegation successfully', async () => {
      // Arrange
      const approvedDelegation = {
        ...mockDelegation,
        status: DelegationStatus.PENDING, // Start with pending status
        approvedAt: new Date(),
        approvalNotes: approveDto.approvalNotes,
        isPending: jest.fn().mockReturnValue(true),
        isActive: jest.fn().mockReturnValue(false),
        isExpired: jest.fn().mockReturnValue(false),
        isApproved: jest.fn().mockReturnValue(true),
        isRejected: jest.fn().mockReturnValue(false),
        isRevoked: jest.fn().mockReturnValue(false),
        canBeActivated: jest.fn().mockReturnValue(true),
        canBeRevoked: jest.fn().mockReturnValue(false),
        getDurationInHours: jest.fn().mockReturnValue(24),
        getRemainingTimeInHours: jest.fn().mockReturnValue(23),
        hasPermission: jest.fn().mockReturnValue(true),
        getPermissionNames: jest.fn().mockReturnValue(['users:read']),
      } as any;

      delegationRepository.findOneWithTenantScope.mockResolvedValue(
        approvedDelegation
      );
      delegationRepository.saveWithTenantScope.mockResolvedValue(
        approvedDelegation
      );
      auditLogRepository.create.mockReturnValue({} as any);
      auditLogRepository.save.mockResolvedValue({} as any);

      // Act
      const result = await service.approveDelegation(
        'delegation-1',
        'user-1',
        'tenant-1',
        approveDto
      );

      // Assert
      expect(result.status).toBe(DelegationStatus.APPROVED);
      expect(result.approvedAt).toBeDefined();
      expect(result.approvalNotes).toBe(approveDto.approvalNotes);
    });

    it('should throw NotFoundException when delegation not found', async () => {
      // Arrange
      delegationRepository.findOneWithTenantScope.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.approveDelegation(
          'delegation-1',
          'user-1',
          'tenant-1',
          approveDto
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when delegation is not pending', async () => {
      // Arrange
      const nonPendingDelegation = {
        ...mockDelegation,
        status: DelegationStatus.APPROVED,
        isPending: jest.fn().mockReturnValue(false),
        isActive: jest.fn().mockReturnValue(false),
        isExpired: jest.fn().mockReturnValue(false),
        isApproved: jest.fn().mockReturnValue(true),
        isRejected: jest.fn().mockReturnValue(false),
        isRevoked: jest.fn().mockReturnValue(false),
        canBeActivated: jest.fn().mockReturnValue(true),
        canBeRevoked: jest.fn().mockReturnValue(false),
        getDurationInHours: jest.fn().mockReturnValue(24),
        getRemainingTimeInHours: jest.fn().mockReturnValue(23),
        hasPermission: jest.fn().mockReturnValue(true),
        getPermissionNames: jest.fn().mockReturnValue(['users:read']),
      } as any;

      delegationRepository.findOneWithTenantScope.mockResolvedValue(
        nonPendingDelegation
      );

      // Act & Assert
      await expect(
        service.approveDelegation(
          'delegation-1',
          'user-1',
          'tenant-1',
          approveDto
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectDelegation', () => {
    const rejectDto: RejectDelegationDto = {
      rejectionReason: 'Rejected for testing',
    };

    it('should reject a delegation successfully', async () => {
      // Arrange
      const rejectedDelegation = {
        ...mockDelegation,
        status: DelegationStatus.PENDING, // Start with pending status
        rejectedAt: new Date(),
        rejectionReason: rejectDto.rejectionReason,
        isPending: jest.fn().mockReturnValue(true),
        isActive: jest.fn().mockReturnValue(false),
        isExpired: jest.fn().mockReturnValue(false),
        isApproved: jest.fn().mockReturnValue(false),
        isRejected: jest.fn().mockReturnValue(true),
        isRevoked: jest.fn().mockReturnValue(false),
        canBeActivated: jest.fn().mockReturnValue(false),
        canBeRevoked: jest.fn().mockReturnValue(false),
        getDurationInHours: jest.fn().mockReturnValue(24),
        getRemainingTimeInHours: jest.fn().mockReturnValue(23),
        hasPermission: jest.fn().mockReturnValue(true),
        getPermissionNames: jest.fn().mockReturnValue(['users:read']),
      } as any;

      delegationRepository.findOneWithTenantScope.mockResolvedValue(
        rejectedDelegation
      );
      delegationRepository.saveWithTenantScope.mockResolvedValue(
        rejectedDelegation
      );
      auditLogRepository.create.mockReturnValue({} as any);
      auditLogRepository.save.mockResolvedValue({} as any);

      // Act
      const result = await service.rejectDelegation(
        'delegation-1',
        'user-1',
        'tenant-1',
        rejectDto
      );

      // Assert
      expect(result.status).toBe(DelegationStatus.REJECTED);
      expect(result.rejectedAt).toBeDefined();
      expect(result.rejectionReason).toBe(rejectDto.rejectionReason);
    });
  });

  describe('activateDelegation', () => {
    const activateDto: ActivateDelegationDto = {
      confirmActivation: true,
    };

    it('should activate a delegation successfully', async () => {
      // Arrange
      const approvedDelegation = {
        ...mockDelegation,
        status: DelegationStatus.APPROVED,
        delegateId: 'user-2',
        canBeActivated: jest.fn().mockReturnValue(true),
        isActive: jest.fn().mockReturnValue(false),
        isExpired: jest.fn().mockReturnValue(false),
        isPending: jest.fn().mockReturnValue(false),
        isApproved: jest.fn().mockReturnValue(true),
        isRejected: jest.fn().mockReturnValue(false),
        isRevoked: jest.fn().mockReturnValue(false),
        canBeRevoked: jest.fn().mockReturnValue(false),
        getDurationInHours: jest.fn().mockReturnValue(24),
        getRemainingTimeInHours: jest.fn().mockReturnValue(23),
        hasPermission: jest.fn().mockReturnValue(true),
        getPermissionNames: jest.fn().mockReturnValue(['users:read']),
      } as any;

      const activatedDelegation = {
        ...approvedDelegation,
        status: DelegationStatus.ACTIVE,
        activatedAt: new Date(),
        isActive: jest.fn().mockReturnValue(true),
        isExpired: jest.fn().mockReturnValue(false),
        isPending: jest.fn().mockReturnValue(false),
        isApproved: jest.fn().mockReturnValue(false),
        isRejected: jest.fn().mockReturnValue(false),
        isRevoked: jest.fn().mockReturnValue(false),
        canBeActivated: jest.fn().mockReturnValue(false),
        canBeRevoked: jest.fn().mockReturnValue(true),
        getDurationInHours: jest.fn().mockReturnValue(24),
        getRemainingTimeInHours: jest.fn().mockReturnValue(23),
        hasPermission: jest.fn().mockReturnValue(true),
        getPermissionNames: jest.fn().mockReturnValue(['users:read']),
      } as any;

      delegationRepository.findOneWithTenantScope.mockResolvedValue(
        approvedDelegation
      );
      delegationRepository.saveWithTenantScope.mockResolvedValue(
        activatedDelegation
      );
      auditLogRepository.create.mockReturnValue({} as any);
      auditLogRepository.save.mockResolvedValue({} as any);

      // Act
      const result = await service.activateDelegation(
        'delegation-1',
        'user-2',
        'tenant-1',
        activateDto
      );

      // Assert
      expect(result.status).toBe(DelegationStatus.ACTIVE);
      expect(result.activatedAt).toBeDefined();
    });

    it('should throw ForbiddenException when user is not the delegate', async () => {
      // Arrange
      const approvedDelegation = {
        ...mockDelegation,
        status: DelegationStatus.APPROVED,
        delegateId: 'user-2',
        canBeActivated: jest.fn().mockReturnValue(true),
        isActive: jest.fn().mockReturnValue(false),
        isExpired: jest.fn().mockReturnValue(false),
        isPending: jest.fn().mockReturnValue(false),
        isApproved: jest.fn().mockReturnValue(true),
        isRejected: jest.fn().mockReturnValue(false),
        isRevoked: jest.fn().mockReturnValue(false),
        canBeRevoked: jest.fn().mockReturnValue(false),
        getDurationInHours: jest.fn().mockReturnValue(24),
        getRemainingTimeInHours: jest.fn().mockReturnValue(23),
        hasPermission: jest.fn().mockReturnValue(true),
        getPermissionNames: jest.fn().mockReturnValue(['users:read']),
      } as any;

      delegationRepository.findOneWithTenantScope.mockResolvedValue(
        approvedDelegation
      );

      // Act & Assert
      await expect(
        service.activateDelegation(
          'delegation-1',
          'user-1',
          'tenant-1',
          activateDto
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('revokeDelegation', () => {
    const revokeDto: RevokeDelegationDto = {
      revocationReason: 'Revoked for testing',
    };

    it('should revoke a delegation successfully', async () => {
      // Arrange
      const activeDelegation = {
        ...mockDelegation,
        status: DelegationStatus.ACTIVE,
        canBeRevoked: jest.fn().mockReturnValue(true),
        isActive: jest.fn().mockReturnValue(true),
        isExpired: jest.fn().mockReturnValue(false),
        isPending: jest.fn().mockReturnValue(false),
        isApproved: jest.fn().mockReturnValue(false),
        isRejected: jest.fn().mockReturnValue(false),
        isRevoked: jest.fn().mockReturnValue(false),
        canBeActivated: jest.fn().mockReturnValue(false),
        getDurationInHours: jest.fn().mockReturnValue(24),
        getRemainingTimeInHours: jest.fn().mockReturnValue(23),
        hasPermission: jest.fn().mockReturnValue(true),
        getPermissionNames: jest.fn().mockReturnValue(['users:read']),
      } as any;

      const revokedDelegation = {
        ...activeDelegation,
        status: DelegationStatus.REVOKED,
        revokedAt: new Date(),
        revocationReason: revokeDto.revocationReason,
        isActive: jest.fn().mockReturnValue(false),
        isExpired: jest.fn().mockReturnValue(false),
        isPending: jest.fn().mockReturnValue(false),
        isApproved: jest.fn().mockReturnValue(false),
        isRejected: jest.fn().mockReturnValue(false),
        isRevoked: jest.fn().mockReturnValue(true),
        canBeActivated: jest.fn().mockReturnValue(false),
        canBeRevoked: jest.fn().mockReturnValue(false),
        getDurationInHours: jest.fn().mockReturnValue(24),
        getRemainingTimeInHours: jest.fn().mockReturnValue(23),
        hasPermission: jest.fn().mockReturnValue(true),
        getPermissionNames: jest.fn().mockReturnValue(['users:read']),
      } as any;

      delegationRepository.findOneWithTenantScope.mockResolvedValue(
        activeDelegation
      );
      delegationRepository.saveWithTenantScope.mockResolvedValue(
        revokedDelegation
      );
      auditLogRepository.create.mockReturnValue({} as any);
      auditLogRepository.save.mockResolvedValue({} as any);

      // Act
      const result = await service.revokeDelegation(
        'delegation-1',
        'user-1',
        'tenant-1',
        revokeDto
      );

      // Assert
      expect(result.status).toBe(DelegationStatus.REVOKED);
      expect(result.revokedAt).toBeDefined();
      expect(result.revocationReason).toBe(revokeDto.revocationReason);
    });
  });

  describe('getDelegationById', () => {
    it('should return delegation by ID', async () => {
      // Arrange
      delegationRepository.findOneWithTenantScope.mockResolvedValue(
        mockDelegation
      );

      // Act
      const result = await service.getDelegationById(
        'delegation-1',
        'tenant-1'
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('delegation-1');
    });

    it('should throw NotFoundException when delegation not found', async () => {
      // Arrange
      delegationRepository.findOneWithTenantScope.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getDelegationById('delegation-1', 'tenant-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveDelegationsForUser', () => {
    it('should return active delegations for user', async () => {
      // Arrange
      const activeDelegations = [mockDelegation];
      delegationRepository.findActiveDelegationsForUser.mockResolvedValue(
        activeDelegations
      );

      // Act
      const result = await service.getActiveDelegationsForUser(
        'user-2',
        'tenant-1'
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('delegation-1');
    });
  });

  describe('getPendingApprovalsForUser', () => {
    it('should return pending approvals for user', async () => {
      // Arrange
      const pendingDelegations = [mockDelegation];
      delegationRepository.findPendingApprovalsForUser.mockResolvedValue(
        pendingDelegations
      );

      // Act
      const result = await service.getPendingApprovalsForUser(
        'user-1',
        'tenant-1'
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('delegation-1');
    });
  });

  describe('getDelegationStats', () => {
    it('should return delegation statistics', async () => {
      // Arrange
      delegationRepository.count
        .mockResolvedValueOnce(10) // totalDelegations
        .mockResolvedValueOnce(5) // activeDelegations
        .mockResolvedValueOnce(2) // pendingApprovals
        .mockResolvedValueOnce(1) // expiredDelegations
        .mockResolvedValueOnce(1) // revokedDelegations
        .mockResolvedValueOnce(1) // emergencyDelegations
        .mockResolvedValueOnce(3); // delegationsThisMonth

      delegationRepository.find.mockResolvedValue([mockDelegation]);

      // Act
      const result = await service.getDelegationStats('tenant-1');

      // Assert
      expect(result.totalDelegations).toBe(10);
      expect(result.activeDelegations).toBe(5);
      expect(result.pendingApprovals).toBe(2);
      expect(result.expiredDelegations).toBe(1);
      expect(result.revokedDelegations).toBe(1);
      expect(result.emergencyDelegations).toBe(1);
      expect(result.delegationsThisMonth).toBe(3);
    });
  });

  describe('hasActiveDelegation', () => {
    it('should return true when user has active delegation for permissions', async () => {
      // Arrange
      const activeDelegations = [mockDelegation];
      delegationRepository.findActiveDelegationsForUser.mockResolvedValue(
        activeDelegations
      );

      // Act
      const result = await service.hasActiveDelegation('user-2', 'tenant-1', [
        'permission-1',
      ]);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user has no active delegation for permissions', async () => {
      // Arrange
      delegationRepository.findActiveDelegationsForUser.mockResolvedValue([]);

      // Act
      const result = await service.hasActiveDelegation('user-2', 'tenant-1', [
        'permission-1',
      ]);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getDelegationAuditLogs', () => {
    it('should return delegation audit logs', async () => {
      // Arrange
      const auditLogs = [
        {
          id: 'log-1',
          delegationId: 'delegation-1',
          userId: 'user-1',
          action: 'delegation_created',
          details: 'Delegation created',
          createdAt: new Date(),
          user: mockUser,
        },
      ];

      auditLogRepository.find.mockResolvedValue(auditLogs as any);

      // Act
      const result = await service.getDelegationAuditLogs(
        'delegation-1',
        'tenant-1'
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('delegation_created');
    });
  });
});
