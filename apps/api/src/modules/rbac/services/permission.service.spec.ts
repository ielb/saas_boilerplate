import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionService } from './permission.service';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { CreatePermissionDto, UpdatePermissionDto } from '../dto/rbac.dto';
import {
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../entities/permission.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PermissionService', () => {
  let service: PermissionService;
  let permissionRepository: Repository<Permission>;
  let roleRepository: Repository<Role>;
  let userRepository: Repository<User>;

  const mockPermissionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRoleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    permissionRepository = module.get<Repository<Permission>>(
      getRepositoryToken(Permission)
    );
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPermission', () => {
    it('should create a permission successfully', async () => {
      // Arrange
      const createPermissionDto: CreatePermissionDto = {
        name: 'users:create',
        description: 'Create users permission',
        resource: PermissionResource.USERS,
        action: PermissionAction.CREATE,
        scope: PermissionScope.TENANT,
        conditions: { requireApproval: true },
      };

      const mockPermission = {
        id: 'permission-123',
        name: 'users:create',
        description: 'Create users permission',
        resource: PermissionResource.USERS,
        action: PermissionAction.CREATE,
        scope: PermissionScope.TENANT,
        isSystem: false,
        isActive: true,
        conditions: { requireApproval: true },
        getFullName: jest.fn().mockReturnValue('users:create'),
      };

      mockPermissionRepository.create.mockReturnValue(mockPermission);
      mockPermissionRepository.save.mockResolvedValue(mockPermission);

      // Act
      const result = await service.createPermission(createPermissionDto);

      // Assert
      expect(result).toEqual(mockPermission);
      expect(mockPermissionRepository.create).toHaveBeenCalledWith({
        ...createPermissionDto,
        isSystem: false,
        isActive: true,
      });
      expect(mockPermissionRepository.save).toHaveBeenCalledWith(
        mockPermission
      );
    });

    it('should create a system permission', async () => {
      // Arrange
      const createPermissionDto: CreatePermissionDto = {
        name: 'system:manage',
        description: 'System management permission',
        resource: PermissionResource.SYSTEM_SETTINGS,
        action: PermissionAction.MANAGE,
        scope: PermissionScope.GLOBAL,
      };

      const mockPermission = {
        id: 'permission-123',
        name: 'system:manage',
        description: 'System management permission',
        resource: PermissionResource.SYSTEM_SETTINGS,
        action: PermissionAction.MANAGE,
        scope: PermissionScope.GLOBAL,
        isSystem: true,
        isActive: true,
        getFullName: jest.fn().mockReturnValue('system:manage'),
      };

      mockPermissionRepository.create.mockReturnValue(mockPermission);
      mockPermissionRepository.save.mockResolvedValue(mockPermission);

      // Act
      const result = await service.createPermission(createPermissionDto);

      // Assert
      expect(result).toEqual(mockPermission);
      expect(mockPermissionRepository.create).toHaveBeenCalledWith({
        ...createPermissionDto,
        isSystem: false,
        isActive: true,
      });
    });
  });

  describe('getAllPermissions', () => {
    it('should return paginated permissions', async () => {
      // Arrange
      const mockPermissions = [
        {
          id: 'permission-1',
          name: 'users:read',
          description: 'Read users permission',
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
          scope: PermissionScope.TENANT,
          isSystem: false,
          isActive: true,
          conditions: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          fullName: 'users:read',
          getFullName: jest.fn().mockReturnValue('users:read'),
        },
        {
          id: 'permission-2',
          name: 'users:write',
          description: 'Write users permission',
          resource: PermissionResource.USERS,
          action: PermissionAction.UPDATE,
          scope: PermissionScope.TENANT,
          isSystem: false,
          isActive: true,
          conditions: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          fullName: 'users:write',
          getFullName: jest.fn().mockReturnValue('users:write'),
        },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockPermissions, 2]),
      };

      mockPermissionRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder
      );

      // Act
      const result = await service.getAllPermissions(1, 10);

      // Assert
      expect(result.permissions).toEqual(
        mockPermissions.map(permission => ({
          ...permission,
          getFullName: undefined, // This gets removed by mapToResponseDto
        }))
      );
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter permissions by resource', async () => {
      // Arrange
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockPermissionRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder
      );

      // Act
      await service.getAllPermissions(
        1,
        10,
        undefined,
        PermissionResource.USERS
      );

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'permission.resource = :resource',
        { resource: PermissionResource.USERS }
      );
    });
  });

  describe('getSystemPermissions', () => {
    it('should return all system permissions', async () => {
      // Arrange
      const mockPermissions = [
        {
          id: 'permission-1',
          name: 'system:manage',
          description: 'System management permission',
          resource: PermissionResource.SYSTEM_SETTINGS,
          action: PermissionAction.MANAGE,
          scope: PermissionScope.GLOBAL,
          isSystem: true,
          isActive: true,
          getFullName: jest.fn().mockReturnValue('system:manage'),
        },
      ];

      mockPermissionRepository.find.mockResolvedValue(mockPermissions);

      // Act
      const result = await service.getSystemPermissions();

      // Assert
      expect(result).toEqual(mockPermissions);
      expect(mockPermissionRepository.find).toHaveBeenCalledWith({
        where: { isSystem: true },
        order: { name: 'ASC' },
      });
    });
  });

  describe('getPermissionById', () => {
    it('should return permission by ID', async () => {
      // Arrange
      const mockPermission = {
        id: 'permission-123',
        name: 'users:read',
        description: 'Read users permission',
        resource: PermissionResource.USERS,
        action: PermissionAction.READ,
        scope: PermissionScope.TENANT,
        isSystem: false,
        isActive: true,
        getFullName: jest.fn().mockReturnValue('users:read'),
      };

      mockPermissionRepository.findOne.mockResolvedValue(mockPermission);

      // Act
      const result = await service.getPermission('permission-123');

      // Assert
      expect(result).toEqual(mockPermission);
      expect(mockPermissionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'permission-123' },
        relations: ['roles'],
      });
    });

    it('should throw NotFoundException when permission not found', async () => {
      // Arrange
      mockPermissionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getPermission('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updatePermission', () => {
    it('should update permission successfully', async () => {
      // Arrange
      const updatePermissionDto: UpdatePermissionDto = {
        name: 'users:read:enhanced',
        description: 'Enhanced read users permission',
        scope: PermissionScope.TEAM,
        conditions: { requireAudit: true },
        isActive: false,
      };

      const existingPermission = {
        id: 'permission-123',
        name: 'users:read',
        description: 'Read users permission',
        resource: PermissionResource.USERS,
        action: PermissionAction.READ,
        scope: PermissionScope.TENANT,
        isSystem: false,
        isActive: true,
        conditions: null,
        getFullName: jest.fn().mockReturnValue('users:read:enhanced'),
      };

      const updatedPermission = {
        ...existingPermission,
        ...updatePermissionDto,
      };

      mockPermissionRepository.findOne.mockResolvedValue(existingPermission);
      mockPermissionRepository.save.mockResolvedValue(updatedPermission);

      // Act
      const result = await service.updatePermission(
        'permission-123',
        updatePermissionDto
      );

      // Assert
      expect(result).toEqual(updatedPermission);
      expect(mockPermissionRepository.save).toHaveBeenCalledWith(
        updatedPermission
      );
    });

    it('should throw NotFoundException when permission not found', async () => {
      // Arrange
      mockPermissionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updatePermission('non-existent', {})
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to update system permission', async () => {
      // Arrange
      const existingPermission = {
        id: 'permission-123',
        name: 'system:manage',
        isSystem: true,
      };

      mockPermissionRepository.findOne.mockResolvedValue(existingPermission);

      // Act & Assert
      await expect(
        service.updatePermission('permission-123', {})
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePermission', () => {
    it('should delete permission successfully', async () => {
      // Arrange
      const mockPermission = {
        id: 'permission-123',
        name: 'users:read',
        isSystem: false,
      };

      mockPermissionRepository.findOne.mockResolvedValue(mockPermission);
      mockPermissionRepository.delete.mockResolvedValue({ affected: 1 });

      // Act
      await service.deletePermission('permission-123');

      // Assert
      expect(mockPermissionRepository.remove).toHaveBeenCalledWith(
        mockPermission
      );
    });

    it('should throw BadRequestException when trying to delete system permission', async () => {
      // Arrange
      const mockPermission = {
        id: 'permission-123',
        name: 'system:manage',
        isSystem: true,
      };

      mockPermissionRepository.findOne.mockResolvedValue(mockPermission);

      // Act & Assert
      await expect(service.deletePermission('permission-123')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException when permission not found', async () => {
      // Arrange
      mockPermissionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deletePermission('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('createDefaultPermissions', () => {
    it('should create default permissions', async () => {
      // Arrange
      const mockPermissions = [
        {
          id: 'permission-1',
          name: 'users:read',
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
          scope: PermissionScope.TENANT,
          isSystem: true,
          isActive: true,
          getFullName: jest.fn().mockReturnValue('users:read'),
        },
      ];

      mockPermissionRepository.find.mockResolvedValue([]);
      mockPermissionRepository.create.mockReturnValue(mockPermissions[0]);
      mockPermissionRepository.save.mockResolvedValue(mockPermissions[0]);

      // Act
      await service.createDefaultPermissions();

      // Assert
      expect(mockPermissionRepository.create).toHaveBeenCalled();
      expect(mockPermissionRepository.save).toHaveBeenCalled();
    });

    it('should not create default permissions if they already exist', async () => {
      // Arrange
      const existingPermissions = [
        {
          id: 'permission-1',
          name: 'users:read',
          resource: PermissionResource.USERS,
          action: PermissionAction.READ,
          scope: PermissionScope.TENANT,
          isSystem: true,
          isActive: true,
          getFullName: jest.fn().mockReturnValue('users:read'),
        },
      ];

      mockPermissionRepository.findOne.mockResolvedValue(
        existingPermissions[0]
      );

      // Act
      await service.createDefaultPermissions();

      // Assert
      expect(mockPermissionRepository.create).not.toHaveBeenCalled();
      expect(mockPermissionRepository.save).not.toHaveBeenCalled();
    });
  });
});
