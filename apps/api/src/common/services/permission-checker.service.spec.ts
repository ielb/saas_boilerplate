import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PermissionCheckerService } from './permission-checker.service';
import { PermissionService } from '../../modules/rbac/services/permission.service';
import { RoleService } from '../../modules/rbac/services/role.service';
import {
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../../modules/rbac/entities/permission.entity';

describe('PermissionCheckerService', () => {
  let service: PermissionCheckerService;
  let permissionService: PermissionService;
  let roleService: RoleService;

  const mockPermissionService = {
    getPermissionsByIds: jest.fn(),
  };

  const mockRoleService = {
    getUserPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionCheckerService,
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

    service = module.get<PermissionCheckerService>(PermissionCheckerService);
    permissionService = module.get<PermissionService>(PermissionService);
    roleService = module.get<RoleService>(RoleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return true when user has exact permission', async () => {
      const userPermissions = ['users:read'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const result = await service.hasPermission(
        'user-123',
        PermissionResource.USERS,
        PermissionAction.READ
      );

      expect(result).toBe(true);
    });

    it('should return true when user has manage permission', async () => {
      const userPermissions = ['users:manage'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const result = await service.hasPermission(
        'user-123',
        PermissionResource.USERS,
        PermissionAction.READ
      );

      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', async () => {
      const userPermissions = ['other:permission'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const result = await service.hasPermission(
        'user-123',
        PermissionResource.USERS,
        PermissionAction.READ
      );

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has any of the required permissions', async () => {
      const userPermissions = ['users:create'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const permissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
        },
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.CREATE,
        },
      ];

      const result = await service.hasAnyPermission('user-123', permissions);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the required permissions', async () => {
      const userPermissions = ['other:permission'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const permissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
        },
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.CREATE,
        },
      ];

      const result = await service.hasAnyPermission('user-123', permissions);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all required permissions', async () => {
      const userPermissions = ['users:read', 'users:create'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const permissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
        },
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.CREATE,
        },
      ];

      const result = await service.hasAllPermissions('user-123', permissions);

      expect(result).toBe(true);
    });

    it('should return false when user lacks any required permission', async () => {
      const userPermissions = ['users:read'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const permissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
        },
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.CREATE,
        },
      ];

      const result = await service.hasAllPermissions('user-123', permissions);

      expect(result).toBe(false);
    });
  });

  describe('assertPermission', () => {
    it('should not throw when user has permission', async () => {
      const userPermissions = ['users:read'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      await expect(
        service.assertPermission(
          'user-123',
          PermissionResource.USERS,
          PermissionAction.READ
        )
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      const userPermissions = ['other:permission'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      await expect(
        service.assertPermission(
          'user-123',
          PermissionResource.USERS,
          PermissionAction.READ
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertAnyPermission', () => {
    it('should not throw when user has any required permission', async () => {
      const userPermissions = ['users:create'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const permissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
        },
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.CREATE,
        },
      ];

      await expect(
        service.assertAnyPermission('user-123', permissions)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks all required permissions', async () => {
      const userPermissions = ['other:permission'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const permissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
        },
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.CREATE,
        },
      ];

      await expect(
        service.assertAnyPermission('user-123', permissions)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertAllPermissions', () => {
    it('should not throw when user has all required permissions', async () => {
      const userPermissions = ['users:read', 'users:create'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const permissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
        },
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.CREATE,
        },
      ];

      await expect(
        service.assertAllPermissions('user-123', permissions)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks any required permission', async () => {
      const userPermissions = ['users:read'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const permissions = [
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
        },
        {
          resource: PermissionResource.USERS,
          action: PermissionAction.CREATE,
        },
      ];

      await expect(
        service.assertAllPermissions('user-123', permissions)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions from role service', async () => {
      const userPermissions = ['users:read', 'users:create'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const result = await service.getUserPermissions('user-123');

      expect(result).toEqual(userPermissions);
    });
  });

  describe('canPerformAction', () => {
    it('should return true when user can perform action', async () => {
      const userPermissions = ['users:read'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const result = await service.canPerformAction(
        'user-123',
        PermissionResource.USERS,
        PermissionAction.READ
      );

      expect(result).toBe(true);
    });

    it('should return false when user cannot perform action', async () => {
      const userPermissions = ['other:permission'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const result = await service.canPerformAction(
        'user-123',
        PermissionResource.USERS,
        PermissionAction.READ
      );

      expect(result).toBe(false);
    });
  });

  describe('CRUD permission methods', () => {
    it('should check create permission correctly', async () => {
      const userPermissions = ['users:create'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const result = await service.canCreate(
        'user-123',
        PermissionResource.USERS
      );

      expect(result).toBe(true);
    });

    it('should check read permission correctly', async () => {
      const userPermissions = ['users:read'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const result = await service.canRead(
        'user-123',
        PermissionResource.USERS
      );

      expect(result).toBe(true);
    });

    it('should check update permission correctly', async () => {
      const userPermissions = ['users:update'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const result = await service.canUpdate(
        'user-123',
        PermissionResource.USERS
      );

      expect(result).toBe(true);
    });

    it('should check delete permission correctly', async () => {
      const userPermissions = ['users:delete'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const result = await service.canDelete(
        'user-123',
        PermissionResource.USERS
      );

      expect(result).toBe(true);
    });

    it('should check manage permission correctly', async () => {
      const userPermissions = ['users:manage'];
      jest
        .spyOn(roleService, 'getUserPermissions')
        .mockResolvedValue(userPermissions);

      const result = await service.canManage(
        'user-123',
        PermissionResource.USERS
      );

      expect(result).toBe(true);
    });
  });
});
