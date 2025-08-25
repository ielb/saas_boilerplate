import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionService } from '../services/permission.service';
import { RoleService } from '../services/role.service';
import {
  PermissionResource,
  PermissionAction,
} from '../entities/permission.entity';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let permissionService: PermissionService;
  let roleService: RoleService;

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'user-123', tenantId: 'tenant-123' },
        method: 'GET',
        url: '/api/test',
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;

  const mockPermissionService = {
    getPermissionsByIds: jest.fn(),
  };

  const mockRoleService = {
    getUserPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
    permissionService = module.get<PermissionService>(PermissionService);
    roleService = module.get<RoleService>(RoleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no permissions are required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should return true when user has required permission', async () => {
      const requiredPermissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
        },
      ];

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(requiredPermissions);
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(['users:read']);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should return true when user has manage permission for the resource', async () => {
      const requiredPermissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.CREATE,
        },
      ];

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(requiredPermissions);
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(['users:manage']);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should return true when user has any of the required permissions', async () => {
      const requiredPermissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
        },
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.CREATE,
        },
      ];

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(requiredPermissions);
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(['users:create']);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      const requiredPermissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
        },
      ];

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(requiredPermissions);

      const contextWithoutUser = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: null,
            method: 'GET',
            url: '/api/test',
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      await expect(guard.canActivate(contextWithoutUser)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException when user lacks required permissions', async () => {
      const requiredPermissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
        },
      ];

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(requiredPermissions);
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(['other:permission']);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should handle conditions in permission metadata', async () => {
      const requiredPermissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
          conditions: { ownerOnly: true },
        },
      ];

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(requiredPermissions);
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(['users:read']);

      const contextWithOwner = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              id: 'user-123',
              ownerId: 'user-123',
              tenantId: 'tenant-123',
            },
            method: 'GET',
            url: '/api/test',
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      const result = await guard.canActivate(contextWithOwner);

      expect(result).toBe(true);
    });

    it('should reject when conditions are not met', async () => {
      const requiredPermissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
          conditions: { ownerOnly: true },
        },
      ];

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(requiredPermissions);
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(['users:read']);

      const contextWithNonOwner = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              id: 'user-123',
              ownerId: 'other-user',
              tenantId: 'tenant-123',
            },
            method: 'GET',
            url: '/api/test',
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      await expect(guard.canActivate(contextWithNonOwner)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('getUserPermissions', () => {
    it('should return filtered user permissions', async () => {
      const userPermissions = ['users:read', 'users:create', 'roles:manage'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const result = await (guard as any).getUserPermissions(
        'user-123',
        'tenant-123'
      );

      expect(result).toEqual(userPermissions);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has exact permission', async () => {
      const userPermissions = ['users:read'];
      const requiredPermission = {
        resource: PermissionResource.USERS,
        action: PermissionAction.READ,
      };
      const user = { id: 'user-123' };

      const result = await (guard as any).hasPermission(
        userPermissions,
        requiredPermission,
        user
      );

      expect(result).toBe(true);
    });

    it('should return true when user has manage permission', async () => {
      const userPermissions = ['users:manage'];
      const requiredPermission = {
        resource: PermissionResource.USERS,
        action: PermissionAction.READ,
      };
      const user = { id: 'user-123' };

      const result = await (guard as any).hasPermission(
        userPermissions,
        requiredPermission,
        user
      );

      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', async () => {
      const userPermissions = ['other:permission'];
      const requiredPermission = {
        resource: PermissionResource.USERS,
        action: PermissionAction.READ,
      };
      const user = { id: 'user-123' };

      const result = await (guard as any).hasPermission(
        userPermissions,
        requiredPermission,
        user
      );

      expect(result).toBe(false);
    });
  });

  describe('evaluateConditions', () => {
    it('should return true when no conditions are specified', () => {
      const conditions = {};
      const user = { id: 'user-123' };

      const result = (guard as any).evaluateConditions(conditions, user);

      expect(result).toBe(true);
    });

    it('should return true when ownerOnly condition is met', () => {
      const conditions = { ownerOnly: true };
      const user = { id: 'user-123', ownerId: 'user-123' };

      const result = (guard as any).evaluateConditions(conditions, user);

      expect(result).toBe(true);
    });

    it('should return false when ownerOnly condition is not met', () => {
      const conditions = { ownerOnly: true };
      const user = { id: 'user-123', ownerId: 'other-user' };

      const result = (guard as any).evaluateConditions(conditions, user);

      expect(result).toBe(false);
    });

    it('should return true when sameTenant condition is met', () => {
      const conditions = { sameTenant: true };
      const user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        targetTenantId: 'tenant-123',
      };

      const result = (guard as any).evaluateConditions(conditions, user);

      expect(result).toBe(true);
    });

    it('should return false when sameTenant condition is not met', () => {
      const conditions = { sameTenant: true };
      const user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        targetTenantId: 'other-tenant',
      };

      const result = (guard as any).evaluateConditions(conditions, user);

      expect(result).toBe(false);
    });

    it('should return true when roleRequired condition is met', () => {
      const conditions = { roleRequired: 'admin' };
      const user = { id: 'user-123', roles: ['admin', 'user'] };

      const result = (guard as any).evaluateConditions(conditions, user);

      expect(result).toBe(true);
    });

    it('should return false when roleRequired condition is not met', () => {
      const conditions = { roleRequired: 'admin' };
      const user = { id: 'user-123', roles: ['user'] };

      const result = (guard as any).evaluateConditions(conditions, user);

      expect(result).toBe(false);
    });
  });
});
