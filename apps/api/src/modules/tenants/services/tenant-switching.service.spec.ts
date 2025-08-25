import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { TenantSwitchingService } from './tenant-switching.service';
import { Tenant, UserTenantMembership } from '../entities';
import { User } from '../../users/entities/user.entity';
import { AuditEventType } from '../../audit/entities/audit-log.entity';
import { JwtService } from '../../auth/services/jwt.service';
import { AuditService } from '../../audit/services/audit.service';
import { PermissionService } from '../../rbac/services/permission.service';
import { TenantCacheUtil } from '../utils/tenant-cache.util';
import { TenantAccessControlService } from './access/tenant-access-control.service';
import { TenantAccessVerificationService } from './access/tenant-access-verification.service';
import { TenantMembershipService } from './membership/tenant-membership.service';
import { TenantCacheService } from './cache/tenant-cache.service';
import { TenantJwtService } from './auth/tenant-jwt.service';
import { UserRole, MembershipStatus } from '@app/shared';

describe('TenantSwitchingService', () => {
  let service: TenantSwitchingService;
  let userRepository: jest.Mocked<Repository<User>>;
  let tenantRepository: jest.Mocked<Repository<Tenant>>;
  let membershipRepository: jest.Mocked<Repository<UserTenantMembership>>;
  let jwtService: jest.Mocked<JwtService>;
  let auditService: jest.Mocked<AuditService>;
  let permissionService: jest.Mocked<PermissionService>;
  let dataSource: jest.Mocked<DataSource>;
  let cacheManager: jest.Mocked<Cache>;
  let cacheUtil: jest.Mocked<TenantCacheUtil>;
  let accessControl: jest.Mocked<TenantAccessControlService>;
  let accessVerification: jest.Mocked<TenantAccessVerificationService>;
  let membershipService: jest.Mocked<TenantMembershipService>;
  let cacheService: jest.Mocked<TenantCacheService>;
  let tenantJwtService: jest.Mocked<TenantJwtService>;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    tenantId: 'tenant-1',
    role: UserRole.MEMBER,
  };

  const mockTenant: Partial<Tenant> = {
    id: 'tenant-1',
    name: 'Test Tenant',
    domain: 'test.example.com',
    plan: 'pro',
    features: ['feature1', 'feature2'],
    settings: { theme: 'dark' },
    isActive: true,
  };

  const mockMembership: Partial<UserTenantMembership> = {
    id: 'membership-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    role: UserRole.MEMBER,
    status: MembershipStatus.ACTIVE,
    joinedAt: new Date(),
    lastAccessedAt: new Date(),
    isActive: true,
    isExpired: false,
    isPending: false,
    isSuspended: false,
    updateLastAccessed: jest.fn(),
    activate: jest.fn(),
    suspend: jest.fn(),
    expire: jest.fn(),
  };

  beforeEach(async () => {
    const mockUserRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockTenantRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockMembershipRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
    };

    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockCacheUtil = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      clearUserCache: jest.fn(),
      clearTenantCache: jest.fn(),
    };

    const mockAccessControl = {
      verifyUserAccess: jest.fn(),
      checkPermission: jest.fn(),
    };

    const mockAccessVerification = {
      verifyTenantAccess: jest.fn(),
      bulkVerifyTenantAccess: jest.fn(),
    };

    const mockMembershipService = {
      getUserTenantMemberships: jest.fn(),
      addUserToTenant: jest.fn(),
      removeUserFromTenant: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getUserMembershipsKey: jest.fn(),
      getUserAccessKey: jest.fn(),
      getTenantBrandingKey: jest.fn(),
      clearUserCache: jest.fn(),
      clearTenantCache: jest.fn(),
    };

    const mockTenantJwtService = {
      generateTenantSwitchToken: jest.fn(),
      verifyTenantToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantSwitchingService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
        {
          provide: getRepositoryToken(UserTenantMembership),
          useValue: mockMembershipRepository,
        },
        {
          provide: JwtService,
          useValue: {
            generateAccessToken: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logTenantSwitchEvent: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            getPermissionsForRole: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
        {
          provide: TenantCacheUtil,
          useValue: mockCacheUtil,
        },
        {
          provide: TenantAccessControlService,
          useValue: mockAccessControl,
        },
        {
          provide: TenantAccessVerificationService,
          useValue: mockAccessVerification,
        },
        {
          provide: TenantMembershipService,
          useValue: mockMembershipService,
        },
        {
          provide: TenantCacheService,
          useValue: mockCacheService,
        },
        {
          provide: TenantJwtService,
          useValue: mockTenantJwtService,
        },
      ],
    }).compile();

    service = module.get<TenantSwitchingService>(TenantSwitchingService);
    userRepository = module.get(getRepositoryToken(User));
    tenantRepository = module.get(getRepositoryToken(Tenant));
    membershipRepository = module.get(getRepositoryToken(UserTenantMembership));
    jwtService = module.get(JwtService);
    auditService = module.get(AuditService);
    permissionService = module.get(PermissionService);
    dataSource = module.get(DataSource);
    cacheManager = module.get(CACHE_MANAGER);
    cacheUtil = module.get(TenantCacheUtil);
    accessControl = module.get(TenantAccessControlService);
    accessVerification = module.get(TenantAccessVerificationService);
    membershipService = module.get(TenantMembershipService);
    cacheService = module.get(TenantCacheService);
    tenantJwtService = module.get(TenantJwtService);
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getUserTenantMemberships', () => {
    it('should return user tenant memberships', async () => {
      // Arrange
      const userId = 'user-1';
      const mockResponse = {
        memberships: [
          {
            ...mockMembership,
            tenant: mockTenant,
            permissions: [{ getFullName: () => 'users:read' }],
          } as UserTenantMembership,
        ],
        currentTenantId: 'tenant-1',
        totalCount: 1,
        activeCount: 1,
        pendingCount: 0,
      };

      membershipService.getUserTenantMemberships.mockResolvedValue(
        mockResponse
      );

      // Act
      const result = await service.getUserTenantMemberships(userId);

      // Assert
      expect(result.memberships).toHaveLength(1);
      expect(result.currentTenantId).toBe('tenant-1');
      expect(result.totalCount).toBe(1);
      expect(result.activeCount).toBe(1);
      expect(result.pendingCount).toBe(0);
      expect(membershipService.getUserTenantMemberships).toHaveBeenCalledWith(
        userId
      );
    });
  });

  describe('verifyTenantAccess', () => {
    it('should verify tenant access', async () => {
      // Arrange
      const userId = 'user-1';
      const verificationDto = {
        tenantId: 'tenant-1',
        permissions: ['users:read'],
      };
      const mockResponse = {
        hasAccess: true,
        permissions: ['users:read'],
        reason: 'Access granted',
      };

      accessVerification.verifyTenantAccess.mockResolvedValue(mockResponse);

      // Act
      const result = await service.verifyTenantAccess(userId, verificationDto);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(accessVerification.verifyTenantAccess).toHaveBeenCalledWith(
        userId,
        verificationDto
      );
    });
  });

  describe('bulkVerifyTenantAccess', () => {
    it('should bulk verify tenant access', async () => {
      // Arrange
      const userId = 'user-1';
      const bulkDto = {
        tenantIds: ['tenant-1', 'tenant-2'],
        permissions: ['users:read'],
      };
      const mockResponse = {
        results: {
          'tenant-1': { hasAccess: true, permissions: ['users:read'] },
          'tenant-2': { hasAccess: false, permissions: [] },
        },
        summary: {
          totalChecked: 2,
          accessGranted: 1,
          accessDenied: 1,
        },
      };

      accessVerification.bulkVerifyTenantAccess.mockResolvedValue(mockResponse);

      // Act
      const result = await service.bulkVerifyTenantAccess(userId, bulkDto);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(accessVerification.bulkVerifyTenantAccess).toHaveBeenCalledWith(
        userId,
        bulkDto
      );
    });
  });

  describe('addUserToTenant', () => {
    it('should add user to tenant', async () => {
      // Arrange
      const userId = 'user-1';
      const tenantId = 'tenant-1';
      const role = UserRole.MEMBER;
      const invitedBy = 'admin-1';

      membershipService.addUserToTenant.mockResolvedValue(
        mockMembership as UserTenantMembership
      );

      // Act
      const result = await service.addUserToTenant(
        userId,
        tenantId,
        role,
        invitedBy
      );

      // Assert
      expect(result).toEqual(mockMembership);
      expect(membershipService.addUserToTenant).toHaveBeenCalledWith(
        userId,
        tenantId,
        role,
        invitedBy
      );
    });
  });

  describe('removeUserFromTenant', () => {
    it('should remove user from tenant', async () => {
      // Arrange
      const userId = 'user-1';
      const tenantId = 'tenant-1';

      membershipService.removeUserFromTenant.mockResolvedValue(undefined);

      // Act
      await service.removeUserFromTenant(userId, tenantId);

      // Assert
      expect(membershipService.removeUserFromTenant).toHaveBeenCalledWith(
        userId,
        tenantId
      );
      expect(membershipService.removeUserFromTenant).toHaveBeenCalledWith(
        userId,
        tenantId
      );
    });
  });

  describe('clearUserCache', () => {
    it('should clear user cache', async () => {
      // Arrange
      const userId = 'user-1';

      cacheService.clearUserCache.mockResolvedValue(undefined);

      // Act
      await service.clearUserCache(userId);

      // Assert
      expect(cacheService.clearUserCache).toHaveBeenCalledWith(userId);
    });
  });
});
