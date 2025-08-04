import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleService } from './role.service';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { User } from '../entities/user.entity';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionsDto,
} from '../dto/rbac.dto';
import { RoleType, RoleLevel } from '../entities/role.entity';
import {
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../entities/permission.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('RoleService', () => {
  let service: RoleService;
  let roleRepository: Repository<Role>;
  let permissionRepository: Repository<Permission>;
  let userRepository: Repository<User>;

  const mockRoleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPermissionRepository = {
    findByIds: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    permissionRepository = module.get<Repository<Permission>>(
      getRepositoryToken(Permission)
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRole', () => {
    it('should create a role successfully', async () => {
      // Arrange
      const createRoleDto: CreateRoleDto = {
        name: 'Test Role',
        description: 'Test role description',
        type: RoleType.CUSTOM,
        level: RoleLevel.MANAGER,
        permissionIds: ['permission-1', 'permission-2'],
      };

      const mockRole = {
        id: 'role-123',
        name: 'Test Role',
        description: 'Test role description',
        type: RoleType.CUSTOM,
        level: RoleLevel.MANAGER,
        tenantId: 'tenant-123',
        isSystem: false,
        isActive: true,
        permissions: [],
        getAllPermissions: jest.fn().mockReturnValue([]),
      };

      const mockPermissions = [
        { id: 'permission-1', name: 'users:read' },
        { id: 'permission-2', name: 'users:write' },
      ];

      mockRoleRepository.create.mockReturnValue(mockRole);
      mockRoleRepository.save.mockResolvedValue(mockRole);
      mockPermissionRepository.findByIds.mockResolvedValue(mockPermissions);

      // Act
      const result = await service.createRole(createRoleDto, 'tenant-123');

      // Assert
      expect(result).toEqual(mockRole);
      expect(mockRoleRepository.create).toHaveBeenCalledWith({
        ...createRoleDto,
        tenantId: 'tenant-123',
        isSystem: false,
        isActive: true,
      });
      expect(mockRoleRepository.save).toHaveBeenCalledWith(mockRole);
      expect(mockPermissionRepository.findByIds).toHaveBeenCalledWith([
        'permission-1',
        'permission-2',
      ]);
    });

    it('should create a role without permissions', async () => {
      // Arrange
      const createRoleDto: CreateRoleDto = {
        name: 'Test Role',
        description: 'Test role description',
        type: RoleType.CUSTOM,
        level: RoleLevel.MANAGER,
      };

      const mockRole = {
        id: 'role-123',
        name: 'Test Role',
        description: 'Test role description',
        type: RoleType.CUSTOM,
        level: RoleLevel.MANAGER,
        tenantId: 'tenant-123',
        isSystem: false,
        isActive: true,
        permissions: [],
        getAllPermissions: jest.fn().mockReturnValue([]),
      };

      mockRoleRepository.create.mockReturnValue(mockRole);
      mockRoleRepository.save.mockResolvedValue(mockRole);

      // Act
      const result = await service.createRole(createRoleDto, 'tenant-123');

      // Assert
      expect(result).toEqual(mockRole);
      expect(mockPermissionRepository.findByIds).not.toHaveBeenCalled();
    });
  });

  describe('getAllRoles', () => {
    it('should return paginated roles for tenant', async () => {
      // Arrange
      const mockRoles = [
        {
          id: 'role-1',
          name: 'Admin',
          description: 'Administrator role',
          type: RoleType.SYSTEM,
          level: RoleLevel.ADMIN,
          tenantId: 'tenant-123',
          isSystem: true,
          isActive: true,
          permissions: [],
          getAllPermissions: jest.fn().mockReturnValue([]),
        },
        {
          id: 'role-2',
          name: 'Manager',
          description: 'Manager role',
          type: RoleType.CUSTOM,
          level: RoleLevel.MANAGER,
          tenantId: 'tenant-123',
          isSystem: false,
          isActive: true,
          permissions: [],
          getAllPermissions: jest.fn().mockReturnValue([]),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockRoles, 2]),
      };

      mockRoleRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getAllRoles('tenant-123', 1, 10);

      // Assert
      expect(result.roles).toEqual(mockRoles);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'role.tenantId = :tenantId',
        { tenantId: 'tenant-123' }
      );
    });

    it('should filter roles by level', async () => {
      // Arrange
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockRoleRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.getAllRoles('tenant-123', 1, 10, RoleLevel.MANAGER);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'role.level = :level',
        { level: RoleLevel.MANAGER }
      );
    });
  });

  describe('getSystemRoles', () => {
    it('should return all system roles', async () => {
      // Arrange
      const mockRoles = [
        {
          id: 'role-1',
          name: 'Super Admin',
          description: 'Super administrator role',
          type: RoleType.SYSTEM,
          level: RoleLevel.OWNER,
          isSystem: true,
          isActive: true,
          permissions: [],
          getAllPermissions: jest.fn().mockReturnValue([]),
        },
      ];

      mockRoleRepository.find.mockResolvedValue(mockRoles);

      // Act
      const result = await service.getSystemRoles();

      // Assert
      expect(result).toEqual(mockRoles);
      expect(mockRoleRepository.find).toHaveBeenCalledWith({
        where: { isSystem: true },
        relations: ['permissions'],
      });
    });
  });

  describe('getCustomRoles', () => {
    it('should return custom roles for tenant', async () => {
      // Arrange
      const mockRoles = [
        {
          id: 'role-1',
          name: 'Custom Role',
          description: 'Custom role for tenant',
          type: RoleType.CUSTOM,
          level: RoleLevel.MANAGER,
          tenantId: 'tenant-123',
          isSystem: false,
          isActive: true,
          permissions: [],
          getAllPermissions: jest.fn().mockReturnValue([]),
        },
      ];

      mockRoleRepository.find.mockResolvedValue(mockRoles);

      // Act
      const result = await service.getCustomRoles('tenant-123');

      // Assert
      expect(result).toEqual(mockRoles);
      expect(mockRoleRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123', isSystem: false },
        relations: ['permissions'],
      });
    });
  });

  describe('getRoleById', () => {
    it('should return role by ID', async () => {
      // Arrange
      const mockRole = {
        id: 'role-123',
        name: 'Test Role',
        description: 'Test role description',
        type: RoleType.CUSTOM,
        level: RoleLevel.MANAGER,
        tenantId: 'tenant-123',
        isSystem: false,
        isActive: true,
        permissions: [],
        getAllPermissions: jest.fn().mockReturnValue([]),
      };

      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      // Act
      const result = await service.getRole('role-123');

      // Assert
      expect(result).toEqual(mockRole);
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'role-123' },
        relations: ['permissions'],
      });
    });

    it('should throw NotFoundException when role not found', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getRole('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateRole', () => {
    it('should update role successfully', async () => {
      // Arrange
      const updateRoleDto: UpdateRoleDto = {
        name: 'Updated Role',
        description: 'Updated description',
        level: RoleLevel.ADMIN,
      };

      const existingRole = {
        id: 'role-123',
        name: 'Old Role',
        description: 'Old description',
        type: RoleType.CUSTOM,
        level: RoleLevel.MANAGER,
        tenantId: 'tenant-123',
        isSystem: false,
        isActive: true,
        permissions: [],
        getAllPermissions: jest.fn().mockReturnValue([]),
      };

      const updatedRole = {
        ...existingRole,
        ...updateRoleDto,
      };

      mockRoleRepository.findOne.mockResolvedValue(existingRole);
      mockRoleRepository.save.mockResolvedValue(updatedRole);

      // Act
      const result = await service.updateRole('role-123', updateRoleDto);

      // Assert
      expect(result).toEqual(updatedRole);
      expect(mockRoleRepository.save).toHaveBeenCalledWith(updatedRole);
    });

    it('should throw NotFoundException when role not found', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateRole('non-existent', {})).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      // Arrange
      const mockRole = {
        id: 'role-123',
        name: 'Test Role',
        isSystem: false,
      };

      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockRoleRepository.delete.mockResolvedValue({ affected: 1 });

      // Act
      await service.deleteRole('role-123');

      // Assert
      expect(mockRoleRepository.delete).toHaveBeenCalledWith('role-123');
    });

    it('should throw BadRequestException when trying to delete system role', async () => {
      // Arrange
      const mockRole = {
        id: 'role-123',
        name: 'System Role',
        isSystem: true,
      };

      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      // Act & Assert
      await expect(service.deleteRole('role-123')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException when role not found', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteRole('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('assignPermissionsToRole', () => {
    it('should assign permissions to role successfully', async () => {
      // Arrange
      const assignPermissionsDto: AssignPermissionsDto = {
        permissionIds: ['permission-1', 'permission-2'],
      };

      const mockRole = {
        id: 'role-123',
        name: 'Test Role',
        permissions: [],
        getAllPermissions: jest.fn().mockReturnValue([]),
      };

      const mockPermissions = [
        { id: 'permission-1', name: 'users:read' },
        { id: 'permission-2', name: 'users:write' },
      ];

      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockPermissionRepository.findByIds.mockResolvedValue(mockPermissions);
      mockRoleRepository.save.mockResolvedValue({
        ...mockRole,
        permissions: mockPermissions,
      });

      // Act
      const result = await service.assignPermissionsToRole(
        'role-123',
        assignPermissionsDto
      );

      // Assert
      expect(result.permissions).toEqual(mockPermissions);
      expect(mockPermissionRepository.findByIds).toHaveBeenCalledWith([
        'permission-1',
        'permission-2',
      ]);
      expect(mockRoleRepository.save).toHaveBeenCalledWith({
        ...mockRole,
        permissions: mockPermissions,
      });
    });

    it('should throw NotFoundException when role not found', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assignPermissionsToRole('non-existent', { permissionIds: [] })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removePermissionsFromRole', () => {
    it('should remove permissions from role successfully', async () => {
      // Arrange
      const mockRole = {
        id: 'role-123',
        name: 'Test Role',
        permissions: [
          { id: 'permission-1', name: 'users:read' },
          { id: 'permission-2', name: 'users:write' },
        ],
        getAllPermissions: jest.fn().mockReturnValue([]),
      };

      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockRoleRepository.save.mockResolvedValue({
        ...mockRole,
        permissions: [],
      });

      // Act
      await service.removePermissionsFromRole('role-123', ['permission-1']);

      // Assert
      expect(mockRoleRepository.save).toHaveBeenCalledWith({
        ...mockRole,
        permissions: [{ id: 'permission-2', name: 'users:write' }],
      });
    });

    it('should throw NotFoundException when role not found', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removePermissionsFromRole('non-existent', [])
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDefaultRoles', () => {
    it('should create default roles for tenant', async () => {
      // Arrange
      const mockRoles = [
        {
          id: 'role-1',
          name: 'Owner',
          type: RoleType.SYSTEM,
          level: RoleLevel.OWNER,
          tenantId: 'tenant-123',
          isSystem: true,
          isActive: true,
          permissions: [],
          getAllPermissions: jest.fn().mockReturnValue([]),
        },
      ];

      mockRoleRepository.find.mockResolvedValue([]);
      mockRoleRepository.create.mockReturnValue(mockRoles[0]);
      mockRoleRepository.save.mockResolvedValue(mockRoles[0]);

      // Act
      await service.createDefaultRoles('tenant-123');

      // Assert
      expect(mockRoleRepository.create).toHaveBeenCalled();
      expect(mockRoleRepository.save).toHaveBeenCalled();
    });

    it('should not create default roles if they already exist', async () => {
      // Arrange
      const existingRoles = [
        {
          id: 'role-1',
          name: 'Owner',
          type: RoleType.SYSTEM,
          level: RoleLevel.OWNER,
          tenantId: 'tenant-123',
          isSystem: true,
          isActive: true,
          permissions: [],
          getAllPermissions: jest.fn().mockReturnValue([]),
        },
      ];

      mockRoleRepository.find.mockResolvedValue(existingRoles);

      // Act
      await service.createDefaultRoles('tenant-123');

      // Assert
      expect(mockRoleRepository.create).not.toHaveBeenCalled();
      expect(mockRoleRepository.save).not.toHaveBeenCalled();
    });
  });
});
