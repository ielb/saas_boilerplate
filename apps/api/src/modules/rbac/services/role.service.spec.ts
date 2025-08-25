import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RoleService } from './role.service';
import { Role, RoleType, RoleLevel } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RoleRepository } from '../repositories/role.repository';
import { UserRepository } from '../repositories/user.repository';
import { CreateRoleDto } from '../dto/rbac.dto';

describe('RoleService', () => {
  let service: RoleService;
  let mockRoleRepository: jest.Mocked<RoleRepository>;
  let mockPermissionRepository: jest.Mocked<Repository<Permission>>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  const createMockRole = (overrides: Partial<Role> = {}): Role =>
    ({
      id: 'role-123',
      name: 'Test Role',
      description: 'Test role description',
      type: RoleType.CUSTOM,
      level: RoleLevel.MANAGER,
      tenantId: 'tenant-123',
      parentRoleId: undefined,
      isSystem: false,
      isActive: true,
      metadata: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: [],
      parentRole: undefined,
      childRoles: [],
      users: [],
      isOwner: jest.fn().mockReturnValue(false),
      isAdmin: jest.fn().mockReturnValue(false),
      isManager: jest.fn().mockReturnValue(true),
      isMember: jest.fn().mockReturnValue(false),
      isViewer: jest.fn().mockReturnValue(false),
      hasHigherLevelThan: jest.fn().mockReturnValue(false),
      hasLowerLevelThan: jest.fn().mockReturnValue(false),
      canManageRole: jest.fn().mockReturnValue(false),
      getInheritedPermissions: jest.fn().mockReturnValue([]),
      getAllPermissions: jest.fn().mockReturnValue([]),
      hasPermission: jest.fn().mockReturnValue(false),
      hasPermissionInScope: jest.fn().mockReturnValue(false),
      ...overrides,
    }) as Role;

  const createMockPermission = (
    overrides: Partial<Permission> = {}
  ): Permission =>
    ({
      id: 'permission-1',
      name: 'test:permission',
      description: 'Test permission',
      resource: 'test',
      action: 'read',
      scope: 'global',
      isSystem: false,
      isActive: true,
      conditions: undefined,
      metadata: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      roles: [],
      getFullName: jest.fn().mockReturnValue('test:read:global'),
      ...overrides,
    }) as Permission;

  beforeEach(async () => {
    const mockRoleRepositoryImpl = {
      findByName: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      saveWithTenantScope: jest.fn(),
      findOneByIdForTenant: jest.fn(),
      findWithPagination: jest.fn(),
      findSystemRoles: jest.fn(),
      findCustomRoles: jest.fn(),
      delete: jest.fn(),
      createTenantScopedQueryBuilder: jest.fn(),
    };

    const mockPermissionRepositoryImpl = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockUserRepositoryImpl = {
      createTenantScopedQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: RoleRepository,
          useValue: mockRoleRepositoryImpl,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepositoryImpl,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepositoryImpl,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    mockRoleRepository = module.get(RoleRepository);
    mockPermissionRepository = module.get(getRepositoryToken(Permission));
    mockUserRepository = module.get(UserRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRole', () => {
    it('should create a role with permissions', async () => {
      // Arrange
      const createRoleDto: CreateRoleDto = {
        name: 'Test Role',
        description: 'Test role description',
        type: RoleType.CUSTOM,
        level: RoleLevel.MANAGER,
        permissionIds: ['permission-1', 'permission-2'],
      };

      const mockRole = createMockRole();
      const mockPermissions = [
        createMockPermission({ id: 'permission-1' }),
        createMockPermission({ id: 'permission-2' }),
      ];

      mockRoleRepository.findByName.mockResolvedValue(null); // No existing role
      mockRoleRepository.create.mockReturnValue(mockRole);
      mockRoleRepository.saveWithTenantScope.mockResolvedValue(mockRole);
      mockRoleRepository.findOneByIdForTenant.mockResolvedValue(mockRole); // For permission assignment
      mockPermissionRepository.find.mockResolvedValue(mockPermissions);

      // Act
      const result = await service.createRole(createRoleDto);

      // Assert
      expect(result).toEqual(mockRole);
      expect(mockPermissionRepository.find).toHaveBeenCalledWith({
        where: { id: In(['permission-1', 'permission-2']) },
      });
    });

    it('should create a role without permissions', async () => {
      // Arrange
      const createRoleDto: CreateRoleDto = {
        name: 'Test Role',
        description: 'Test role description',
        type: RoleType.CUSTOM,
        level: RoleLevel.MANAGER,
      };

      const mockRole = createMockRole();

      mockRoleRepository.findByName.mockResolvedValue(null); // No existing role
      mockRoleRepository.create.mockReturnValue(mockRole);
      mockRoleRepository.saveWithTenantScope.mockResolvedValue(mockRole);

      // Act
      const result = await service.createRole(createRoleDto);

      // Assert
      expect(result).toEqual(mockRole);
      expect(mockPermissionRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('getAllRoles', () => {
    it('should return paginated roles', async () => {
      // Arrange
      const mockRoles = [
        createMockRole({
          id: 'role-1',
          name: 'Admin',
          description: 'Administrator role',
          type: RoleType.SYSTEM,
          level: RoleLevel.ADMIN,
          isSystem: true,
        }),
        createMockRole({
          id: 'role-2',
          name: 'Manager',
          description: 'Manager role',
          type: RoleType.CUSTOM,
          level: RoleLevel.MANAGER,
          isSystem: false,
        }),
      ];

      const mockPaginationResult = {
        roles: mockRoles,
        total: 2,
      };

      mockRoleRepository.findWithPagination.mockResolvedValue(
        mockPaginationResult
      );

      // Act
      const result = await service.getAllRoles(1, 10);

      // Assert
      expect(result).toEqual({
        roles: expect.arrayContaining([
          expect.objectContaining({
            id: 'role-1',
            name: 'Admin',
            totalPermissions: 0,
          }),
          expect.objectContaining({
            id: 'role-2',
            name: 'Manager',
            totalPermissions: 0,
          }),
        ]),
        total: 2,
        page: 1,
        limit: 10,
      });
    });

    it('should return paginated roles with level filter', async () => {
      // Arrange
      const mockRoles = [
        createMockRole({
          id: 'role-1',
          name: 'Manager',
          level: RoleLevel.MANAGER,
        }),
      ];

      const mockPaginationResult = {
        roles: mockRoles,
        total: 1,
      };

      mockRoleRepository.findWithPagination.mockResolvedValue(
        mockPaginationResult
      );

      // Act
      const result = await service.getAllRoles(1, 10, RoleLevel.MANAGER);

      // Assert
      expect(result).toEqual({
        roles: expect.arrayContaining([
          expect.objectContaining({
            id: 'role-1',
            name: 'Manager',
            totalPermissions: 0,
          }),
        ]),
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('getCustomRoles', () => {
    it('should return custom roles', async () => {
      // Arrange
      const mockRoles = [
        createMockRole({
          id: 'role-1',
          name: 'Custom Role 1',
          isSystem: false,
        }),
        createMockRole({
          id: 'role-2',
          name: 'Custom Role 2',
          isSystem: false,
        }),
      ];

      mockRoleRepository.findCustomRoles.mockResolvedValue(mockRoles);

      // Act
      const result = await service.getCustomRoles();

      // Assert
      expect(result).toEqual(mockRoles);
    });
  });

  describe('createDefaultRoles', () => {
    it('should create default roles when they do not exist', async () => {
      // Arrange
      const mockDefaultRole = createMockRole({
        name: 'Super Admin',
        type: RoleType.SYSTEM,
        level: RoleLevel.OWNER,
        isSystem: true,
      });

      mockRoleRepository.findByName.mockResolvedValue(null); // Role doesn't exist
      mockRoleRepository.create.mockReturnValue(mockDefaultRole);
      mockRoleRepository.saveWithTenantScope.mockResolvedValue(mockDefaultRole);

      // Act
      await service.createDefaultRoles();

      // Assert
      expect(mockRoleRepository.findByName).toHaveBeenCalledWith('Super Admin');
      expect(mockRoleRepository.create).toHaveBeenCalled();
      expect(mockRoleRepository.saveWithTenantScope).toHaveBeenCalled();
    });

    it('should not create default roles when they already exist', async () => {
      // Arrange
      const existingRole = createMockRole({
        name: 'Super Admin',
        type: RoleType.SYSTEM,
        level: RoleLevel.OWNER,
        isSystem: true,
      });

      mockRoleRepository.findByName.mockResolvedValue(existingRole); // Role exists

      // Act
      await service.createDefaultRoles();

      // Assert
      expect(mockRoleRepository.findByName).toHaveBeenCalledWith('Super Admin');
      expect(mockRoleRepository.create).not.toHaveBeenCalled();
      expect(mockRoleRepository.saveWithTenantScope).not.toHaveBeenCalled();
    });
  });
});
