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
import { User, Tenant, UserTenantMembership } from '../../auth/entities';
import { AuditEventType } from '../../auth/entities/audit-log.entity';
import { JwtService } from '../../auth/services/jwt.service';
import { AuditService } from '../../auth/services/audit.service';
import { PermissionService } from '../../auth/services/permission.service';
import { TenantCacheUtil } from '../utils/tenant-cache.util';
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
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getUserTenantMemberships', () => {
    it('should return cached memberships if available', async () => {
      // Arrange
      const userId = 'user-1';
      const cachedResponse = {
        memberships: [],
        currentTenantId: 'tenant-1',
        totalCount: 0,
        activeCount: 0,
        pendingCount: 0,
      };

      cacheUtil.get.mockResolvedValue(cachedResponse);

      // Act
      const result = await service.getUserTenantMemberships(userId);

      // Assert
      expect(result).toEqual(cachedResponse);
      expect(cacheUtil.get).toHaveBeenCalledWith(
        TenantCacheUtil.getUserMembershipsKey(userId)
      );
      expect(userRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch and cache memberships if not in cache', async () => {
      // Arrange
      const userId = 'user-1';
      cacheUtil.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(mockUser as User);
      membershipRepository.find.mockResolvedValue([
        {
          ...mockMembership,
          tenant: mockTenant,
          permissions: [{ getFullName: () => 'users:read' }],
        },
      ] as any);

      // Act
      const result = await service.getUserTenantMemberships(userId);

      // Assert
      expect(result.memberships).toHaveLength(1);
      expect(result.currentTenantId).toBe('tenant-1');
      expect(cacheUtil.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      cacheUtil.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserTenantMemberships(userId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('switchTenant', () => {
    it('should successfully switch tenant', async () => {
      // Arrange
      const userId = 'user-1';
      const switchDto = {
        tenantId: 'tenant-2',
        reason: 'Testing switch',
      };

      const mockManager = {
        findOne: jest.fn(),
        update: jest.fn(),
        save: jest.fn(),
      };

      dataSource.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockManager);
      });

      mockManager.findOne
        .mockResolvedValueOnce({
          ...mockMembership,
          tenantId: 'tenant-2',
          tenant: { ...mockTenant, id: 'tenant-2' },
          permissions: [],
        })
        .mockResolvedValueOnce(mockUser);

      jwtService.generateAccessToken = jest
        .fn()
        .mockResolvedValue('new-jwt-token');

      // Act
      const result = await service.switchTenant(userId, switchDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new-jwt-token');
      expect(mockManager.update).toHaveBeenCalledWith(
        User,
        { id: userId },
        { tenantId: switchDto.tenantId }
      );
      expect(auditService.logTenantSwitchEvent).toHaveBeenCalledWith({
        eventType: AuditEventType.TENANT_SWITCHED,
        userId,
        userEmail: mockUser.email,
        fromTenantId: mockUser.tenantId,
        toTenantId: switchDto.tenantId,
        membershipId: mockMembership.id,
        reason: switchDto.reason,
      });
    });

    it('should throw ForbiddenException if user has no access to tenant', async () => {
      // Arrange
      const userId = 'user-1';
      const switchDto = {
        tenantId: 'unauthorized-tenant',
      };

      const mockManager = {
        findOne: jest.fn(),
      };

      dataSource.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockManager);
      });

      mockManager.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.switchTenant(userId, switchDto)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException if membership is not active', async () => {
      // Arrange
      const userId = 'user-1';
      const switchDto = {
        tenantId: 'tenant-2',
      };

      const inactiveMembership = {
        ...mockMembership,
        status: MembershipStatus.SUSPENDED,
        isActive: false,
      };

      const mockManager = {
        findOne: jest.fn(),
      };

      dataSource.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockManager);
      });

      mockManager.findOne.mockResolvedValue(inactiveMembership);

      // Act & Assert
      await expect(service.switchTenant(userId, switchDto)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('verifyTenantAccess', () => {
    it('should return cached access result if available', async () => {
      // Arrange
      const userId = 'user-1';
      const verificationDto = {
        tenantId: 'tenant-1',
      };
      const cachedResponse = {
        hasAccess: true,
        role: 'member',
        status: 'active',
        permissions: ['users:read'],
      };

      cacheUtil.get.mockResolvedValue(cachedResponse);

      // Act
      const result = await service.verifyTenantAccess(userId, verificationDto);

      // Assert
      expect(result).toEqual(cachedResponse);
      expect(membershipRepository.findOne).not.toHaveBeenCalled();
    });

    it('should verify access and cache result', async () => {
      // Arrange
      const userId = 'user-1';
      const verificationDto = {
        tenantId: 'tenant-1',
        permissions: ['users:read'],
      };

      cacheUtil.get.mockResolvedValue(null);
      membershipRepository.findOne.mockResolvedValue({
        ...mockMembership,
        tenant: mockTenant,
        permissions: [{ getFullName: () => 'users:read' }],
      } as any);

      permissionService.getPermissionScopes = jest
        .fn()
        .mockResolvedValue([{ getFullName: () => 'basic:access' }] as any);

      // Act
      const result = await service.verifyTenantAccess(userId, verificationDto);

      // Assert
      expect(result.hasAccess).toBe(true);
      expect(result.role).toBe(UserRole.MEMBER);
      expect(result.permissions).toContain('users:read');
      expect(result.permissions).toContain('basic:access');
      expect(cacheUtil.set).toHaveBeenCalled();
    });

    it('should deny access if user is not a member', async () => {
      // Arrange
      const userId = 'user-1';
      const verificationDto = {
        tenantId: 'unauthorized-tenant',
      };

      cacheUtil.get.mockResolvedValue(null);
      membershipRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.verifyTenantAccess(userId, verificationDto);

      // Assert
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('User is not a member of this tenant');
      expect(auditService.logTenantSwitchEvent).toHaveBeenCalledWith({
        eventType: AuditEventType.TENANT_ACCESS_DENIED,
        userId,
        toTenantId: verificationDto.tenantId,
        reason: 'User is not a member of this tenant',
      });
    });

    it('should deny access if membership is not active', async () => {
      // Arrange
      const userId = 'user-1';
      const verificationDto = {
        tenantId: 'tenant-1',
      };

      const inactiveMembership = {
        ...mockMembership,
        status: MembershipStatus.SUSPENDED,
        isActive: false,
      };

      cacheUtil.get.mockResolvedValue(null);
      membershipRepository.findOne.mockResolvedValue(inactiveMembership as any);

      // Act
      const result = await service.verifyTenantAccess(userId, verificationDto);

      // Assert
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe(
        `Membership status is ${MembershipStatus.SUSPENDED}`
      );
      expect(auditService.logTenantSwitchEvent).toHaveBeenCalledWith({
        eventType: AuditEventType.TENANT_ACCESS_DENIED,
        userId,
        toTenantId: verificationDto.tenantId,
        membershipId: inactiveMembership.id,
        reason: `Membership status is ${MembershipStatus.SUSPENDED}`,
      });
    });
  });

  describe('addUserToTenant', () => {
    it('should successfully add user to tenant', async () => {
      // Arrange
      const userId = 'user-1';
      const tenantId = 'tenant-1';
      const role = UserRole.MEMBER;

      membershipRepository.findOne.mockResolvedValue(null);
      tenantRepository.findOne.mockResolvedValue(mockTenant as Tenant);
      membershipRepository.create.mockReturnValue(mockMembership as any);
      membershipRepository.save.mockResolvedValue(mockMembership as any);

      // Act
      const result = await service.addUserToTenant(userId, tenantId, role);

      // Assert
      expect(result).toEqual(mockMembership);
      expect(membershipRepository.create).toHaveBeenCalledWith({
        userId,
        tenantId,
        role,
        status: MembershipStatus.ACTIVE,
        joinedAt: expect.any(Date),
        invitedBy: undefined,
      });
      expect(auditService.logTenantSwitchEvent).toHaveBeenCalledWith({
        eventType: AuditEventType.TENANT_MEMBERSHIP_CREATED,
        userId,
        toTenantId: tenantId,
        membershipId: mockMembership.id,
        reason: `Added with role: ${role}`,
      });
    });

    it('should throw BadRequestException if user is already a member', async () => {
      // Arrange
      const userId = 'user-1';
      const tenantId = 'tenant-1';
      const role = UserRole.MEMBER;

      membershipRepository.findOne.mockResolvedValue(mockMembership as any);

      // Act & Assert
      await expect(
        service.addUserToTenant(userId, tenantId, role)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      // Arrange
      const userId = 'user-1';
      const tenantId = 'non-existent-tenant';
      const role = UserRole.MEMBER;

      membershipRepository.findOne.mockResolvedValue(null);
      tenantRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.addUserToTenant(userId, tenantId, role)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeUserFromTenant', () => {
    it('should successfully remove user from tenant', async () => {
      // Arrange
      const userId = 'user-1';
      const tenantId = 'tenant-1';

      membershipRepository.findOne.mockResolvedValue(mockMembership as any);
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        tenantId: 'other-tenant',
      } as User);

      // Act
      await service.removeUserFromTenant(userId, tenantId);

      // Assert
      expect(membershipRepository.softDelete).toHaveBeenCalledWith(
        mockMembership.id
      );
      expect(auditService.logTenantSwitchEvent).toHaveBeenCalledWith({
        eventType: AuditEventType.TENANT_MEMBERSHIP_DELETED,
        userId,
        toTenantId: tenantId,
        membershipId: mockMembership.id,
        reason: 'Membership removed',
      });
    });

    it('should switch to another tenant if removing current tenant', async () => {
      // Arrange
      const userId = 'user-1';
      const tenantId = 'tenant-1';

      const otherMembership = {
        ...mockMembership,
        tenantId: 'other-tenant',
      };

      membershipRepository.findOne
        .mockResolvedValueOnce(mockMembership as any)
        .mockResolvedValueOnce(otherMembership as any);

      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        tenantId: tenantId, // Current tenant is the one being removed
      } as User);

      // Act
      await service.removeUserFromTenant(userId, tenantId);

      // Assert
      expect(userRepository.update).toHaveBeenCalledWith(
        { id: userId },
        { tenantId: 'other-tenant' }
      );
    });

    it('should throw NotFoundException if membership not found', async () => {
      // Arrange
      const userId = 'user-1';
      const tenantId = 'tenant-1';

      membershipRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removeUserFromTenant(userId, tenantId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearUserCache', () => {
    it('should clear user cache', async () => {
      // Arrange
      const userId = 'user-1';

      // Act
      await service.clearUserCache(userId);

      // Assert
      expect(cacheUtil.clearUserCache).toHaveBeenCalledWith(userId);
    });
  });

  describe('bulkVerifyTenantAccess', () => {
    it('should verify access to multiple tenants', async () => {
      // Arrange
      const userId = 'user-1';
      const bulkDto = {
        tenantIds: ['tenant-1', 'tenant-2'],
        permissions: ['users:read'],
      };

      // Mock verifyTenantAccess to return different results
      const verifyTenantAccessSpy = jest
        .spyOn(service, 'verifyTenantAccess')
        .mockResolvedValueOnce({
          hasAccess: true,
          role: 'member',
          status: 'active',
          permissions: ['users:read'],
        })
        .mockResolvedValueOnce({
          hasAccess: false,
          permissions: [],
          reason: 'User is not a member of this tenant',
        });

      // Act
      const result = await service.bulkVerifyTenantAccess(userId, bulkDto);

      // Assert
      expect(result.results?.['tenant-1']?.hasAccess).toBe(true);
      expect(result.results?.['tenant-2']?.hasAccess).toBe(false);
      expect(result.summary.totalChecked).toBe(2);
      expect(result.summary.accessGranted).toBe(1);
      expect(result.summary.accessDenied).toBe(1);
      expect(verifyTenantAccessSpy).toHaveBeenCalledTimes(2);

      verifyTenantAccessSpy.mockRestore();
    });
  });
});
