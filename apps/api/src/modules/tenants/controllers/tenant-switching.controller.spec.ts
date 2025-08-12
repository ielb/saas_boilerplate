import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { TenantSwitchingController } from './tenant-switching.controller';
import { TenantSwitchingService } from '../services/tenant-switching.service';
import { JwtService } from '../../auth/services/jwt.service';
import { UserRole, MembershipStatus } from '@app/shared';

describe('TenantSwitchingController', () => {
  let controller: TenantSwitchingController;
  let service: jest.Mocked<TenantSwitchingService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    tenantId: 'tenant-1',
  };

  const mockRequest = {
    user: mockUser,
    params: {},
    body: {},
  };

  beforeEach(async () => {
    const mockService = {
      getUserTenantMemberships: jest.fn(),
      switchTenant: jest.fn(),
      getCurrentTenantContext: jest.fn(),
      verifyTenantAccess: jest.fn(),
      bulkVerifyTenantAccess: jest.fn(),
      addUserToTenant: jest.fn(),
      removeUserFromTenant: jest.fn(),
      clearUserCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantSwitchingController],
      providers: [
        {
          provide: TenantSwitchingService,
          useValue: mockService,
        },
        {
          provide: JwtService,
          useValue: {
            validateTokenFormat: jest.fn().mockReturnValue(true),
            getTokenType: jest.fn().mockReturnValue('access'),
            isTokenExpired: jest.fn().mockReturnValue(false),
            verifyAccessToken: jest.fn().mockReturnValue({
              sub: 'user-1',
              role: 'admin',
              tenantId: 'tenant-1',
            }),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue(false), // Default to no special requirements
          },
        },
      ],
    }).compile();

    controller = module.get<TenantSwitchingController>(
      TenantSwitchingController
    );
    service = module.get(TenantSwitchingService);
  });

  describe('getUserTenantMemberships', () => {
    it('should return user tenant memberships', async () => {
      // Arrange
      const expectedResponse = {
        memberships: [
          {
            id: 'membership-1',
            tenant: {
              id: 'tenant-1',
              name: 'Test Tenant',
              domain: 'test.example.com',
              plan: 'pro',
              features: ['feature1'],
              settings: {},
            },
            role: UserRole.MEMBER,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date(),
            lastAccessedAt: new Date(),
            permissions: ['users:read'],
            isCurrentTenant: true,
            isActive: true,
            isExpired: false,
          },
        ],
        currentTenantId: 'tenant-1',
        totalCount: 1,
        activeCount: 1,
        pendingCount: 0,
      };

      service.getUserTenantMemberships.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.getUserTenantMemberships(mockRequest);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(service.getUserTenantMemberships).toHaveBeenCalledWith('user-1');
    });
  });

  describe('switchTenant', () => {
    it('should successfully switch tenant', async () => {
      // Arrange
      const switchDto = {
        tenantId: 'tenant-2',
        reason: 'Testing switch',
      };

      const expectedResponse = {
        success: true,
        message: 'Successfully switched to tenant: New Tenant',
        tenantContext: {
          id: 'tenant-2',
          name: 'New Tenant',
          domain: 'new.example.com',
          plan: 'enterprise',
          features: ['feature1', 'feature2'],
          settings: {},
        },
        membership: {
          role: UserRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
          lastAccessedAt: new Date(),
          permissions: ['users:read', 'users:write'],
        },
        accessToken: 'new-jwt-token',
      };

      service.switchTenant.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.switchTenant(mockRequest, switchDto);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(service.switchTenant).toHaveBeenCalledWith('user-1', switchDto);
    });
  });

  describe('getCurrentTenantContext', () => {
    it('should return current tenant context', async () => {
      // Arrange
      const mockTenant = {
        id: 'tenant-1',
        name: 'Current Tenant',
        domain: 'current.example.com',
        plan: 'pro',
        features: ['feature1'],
        settings: { theme: 'dark' },
      };

      const mockMembership = {
        id: 'membership-1',
        role: UserRole.MEMBER,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
        lastAccessedAt: new Date(),
        permissions: [{ getFullName: () => 'users:read' }],
      };

      service.getCurrentTenantContext.mockResolvedValue({
        tenant: mockTenant,
        membership: mockMembership,
      } as any);

      // Act
      const result = await controller.getCurrentTenantContext(mockRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.tenantContext).toEqual({
        id: mockTenant.id,
        name: mockTenant.name,
        domain: mockTenant.domain,
        plan: mockTenant.plan,
        features: mockTenant.features,
        settings: mockTenant.settings,
      });
      expect(result.membership.role).toBe(UserRole.MEMBER);
    });
  });

  describe('verifyTenantAccess', () => {
    it('should verify tenant access', async () => {
      // Arrange
      const tenantId = 'tenant-1';
      const verificationDto = {
        permissions: ['users:read'],
      };

      const expectedResponse = {
        hasAccess: true,
        role: UserRole.MEMBER,
        status: MembershipStatus.ACTIVE,
        permissions: ['users:read', 'basic:access'],
        tenant: {
          id: tenantId,
          name: 'Test Tenant',
          domain: 'test.example.com',
          plan: 'pro',
          features: ['feature1'],
        },
        permissionChecks: {
          'users:read': true,
        },
      };

      service.verifyTenantAccess.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.verifyTenantAccess(
        mockRequest,
        tenantId,
        verificationDto
      );

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(service.verifyTenantAccess).toHaveBeenCalledWith('user-1', {
        tenantId,
        permissions: verificationDto.permissions,
        resource: undefined,
      });
    });
  });

  describe('bulkVerifyTenantAccess', () => {
    it('should verify access to multiple tenants', async () => {
      // Arrange
      const bulkDto = {
        tenantIds: ['tenant-1', 'tenant-2'],
        permissions: ['users:read'],
      };

      const expectedResponse = {
        results: {
          'tenant-1': {
            hasAccess: true,
            role: UserRole.MEMBER,
            status: MembershipStatus.ACTIVE,
            permissions: ['users:read'],
          },
          'tenant-2': {
            hasAccess: false,
            permissions: [],
            reason: 'User is not a member of this tenant',
          },
        },
        summary: {
          totalChecked: 2,
          accessGranted: 1,
          accessDenied: 1,
        },
      };

      service.bulkVerifyTenantAccess.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.bulkVerifyTenantAccess(
        mockRequest,
        bulkDto
      );

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(service.bulkVerifyTenantAccess).toHaveBeenCalledWith(
        'user-1',
        bulkDto
      );
    });
  });

  describe('addUserToTenant', () => {
    it('should add user to tenant (admin endpoint)', async () => {
      // Arrange
      const body = {
        userId: 'user-2',
        tenantId: 'tenant-1',
        role: UserRole.MEMBER,
      };

      const mockMembership = {
        id: 'membership-1',
        userId: 'user-2',
        tenantId: 'tenant-1',
        role: UserRole.MEMBER,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
      };

      service.addUserToTenant.mockResolvedValue(mockMembership as any);

      // Act
      const result = await controller.addUserToTenant(mockRequest, body);

      // Assert
      expect(result.success).toBe(true);
      expect(result.membership.userId).toBe('user-2');
      expect(service.addUserToTenant).toHaveBeenCalledWith(
        'user-2',
        'tenant-1',
        UserRole.MEMBER,
        'user-1'
      );
    });
  });

  describe('removeUserFromTenant', () => {
    it('should remove user from tenant (admin endpoint)', async () => {
      // Arrange
      const userId = 'user-2';
      const tenantId = 'tenant-1';

      service.removeUserFromTenant.mockResolvedValue();

      // Act
      const result = await controller.removeUserFromTenant(
        mockRequest,
        userId,
        tenantId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('User removed from tenant successfully');
      expect(service.removeUserFromTenant).toHaveBeenCalledWith(
        userId,
        tenantId
      );
    });
  });

  describe('clearUserCache', () => {
    it('should clear user cache', async () => {
      // Arrange
      service.clearUserCache.mockResolvedValue();

      // Act
      const result = await controller.clearUserCache(mockRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'User tenant switching cache cleared successfully'
      );
      expect(service.clearUserCache).toHaveBeenCalledWith('user-1');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      // Act
      const result = await controller.healthCheck();

      // Assert
      expect(result.status).toBe('ok');
      expect(result.service).toBe('tenant-switching');
      expect(result.version).toBe('1.0.0');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getMembershipDetails', () => {
    it('should return placeholder response', async () => {
      // Arrange
      const membershipId = 'membership-1';

      // Act
      const result = await controller.getMembershipDetails(
        mockRequest,
        membershipId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.membershipId).toBe(membershipId);
      expect(result.message).toContain('to be implemented');
    });
  });
});
