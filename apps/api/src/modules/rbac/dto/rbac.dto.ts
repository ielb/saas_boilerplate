import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsArray,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PermissionScope,
  PermissionAction,
  PermissionResource,
} from '../entities/permission.entity';
import { RoleType, RoleLevel } from '../entities/role.entity';

// Permission DTOs
export class CreatePermissionDto {
  @ApiProperty({ description: 'Permission name', example: 'users:create' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Resource type',
    enum: PermissionResource,
    example: PermissionResource.USERS,
  })
  @IsEnum(PermissionResource)
  resource!: PermissionResource;

  @ApiProperty({
    description: 'Action type',
    enum: PermissionAction,
    example: PermissionAction.CREATE,
  })
  @IsEnum(PermissionAction)
  action!: PermissionAction;

  @ApiPropertyOptional({
    description: 'Permission scope',
    enum: PermissionScope,
    default: PermissionScope.TENANT,
  })
  @IsOptional()
  @IsEnum(PermissionScope)
  scope?: PermissionScope;

  @ApiPropertyOptional({ description: 'Additional conditions' })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;
}

export class UpdatePermissionDto {
  @ApiPropertyOptional({ description: 'Permission name' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Permission scope',
    enum: PermissionScope,
  })
  @IsOptional()
  @IsEnum(PermissionScope)
  scope?: PermissionScope;

  @ApiPropertyOptional({ description: 'Additional conditions' })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether permission is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PermissionResponseDto {
  @ApiProperty({ description: 'Permission ID' })
  id!: string;

  @ApiProperty({ description: 'Permission name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  description?: string | undefined;

  @ApiProperty({ description: 'Resource type' })
  resource!: PermissionResource;

  @ApiProperty({ description: 'Action type' })
  action!: PermissionAction;

  @ApiProperty({ description: 'Permission scope' })
  scope!: PermissionScope;

  @ApiProperty({ description: 'Whether it is a system permission' })
  isSystem!: boolean;

  @ApiPropertyOptional({ description: 'Additional conditions' })
  conditions?: Record<string, any> | undefined;

  @ApiProperty({ description: 'Whether permission is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Full permission name' })
  fullName!: string;
}

// Role DTOs
export class CreateRoleDto {
  @ApiProperty({ description: 'Role name', example: 'Team Manager' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Role type',
    enum: RoleType,
    default: RoleType.CUSTOM,
  })
  @IsOptional()
  @IsEnum(RoleType)
  type?: RoleType;

  @ApiProperty({
    description: 'Role level',
    enum: RoleLevel,
    example: RoleLevel.MANAGER,
  })
  @IsEnum(RoleLevel)
  level!: RoleLevel;

  @ApiPropertyOptional({ description: 'Parent role ID for inheritance' })
  @IsOptional()
  @IsUUID()
  parentRoleId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Permission IDs to assign' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'Role name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Role level',
    enum: RoleLevel,
  })
  @IsOptional()
  @IsEnum(RoleLevel)
  level?: RoleLevel;

  @ApiPropertyOptional({ description: 'Parent role ID for inheritance' })
  @IsOptional()
  @IsUUID()
  parentRoleId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether role is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignPermissionsDto {
  @ApiProperty({
    description: 'Permission IDs to assign',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}

export class RoleResponseDto {
  @ApiProperty({ description: 'Role ID' })
  id!: string;

  @ApiProperty({ description: 'Role name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Role description' })
  description?: string | undefined;

  @ApiProperty({ description: 'Role type' })
  type!: RoleType;

  @ApiProperty({ description: 'Role level' })
  level!: RoleLevel;

  @ApiPropertyOptional({ description: 'Tenant ID' })
  tenantId?: string | undefined;

  @ApiPropertyOptional({ description: 'Parent role ID' })
  parentRoleId?: string | undefined;

  @ApiProperty({ description: 'Whether it is a system role' })
  isSystem!: boolean;

  @ApiProperty({ description: 'Whether role is active' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any> | undefined;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Assigned permissions',
    type: [PermissionResponseDto],
  })
  permissions!: PermissionResponseDto[];

  @ApiProperty({ description: 'Total permissions including inherited' })
  totalPermissions!: number;
}

// User Role Assignment DTOs
export class AssignUserRoleDto {
  @ApiProperty({ description: 'Role ID to assign' })
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UserRoleResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Role ID' })
  roleId!: string;

  @ApiProperty({ description: 'Role name' })
  roleName!: string;

  @ApiProperty({ description: 'Role level' })
  roleLevel!: RoleLevel;

  @ApiProperty({ description: 'Assignment timestamp' })
  assignedAt!: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any> | undefined;
}

// List Response DTOs
export class PermissionListResponseDto {
  @ApiProperty({
    description: 'List of permissions',
    type: [PermissionResponseDto],
  })
  permissions!: PermissionResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Page number' })
  page!: number;

  @ApiProperty({ description: 'Page size' })
  limit!: number;
}

export class RoleListResponseDto {
  @ApiProperty({
    description: 'List of roles',
    type: [RoleResponseDto],
  })
  roles!: RoleResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Page number' })
  page!: number;

  @ApiProperty({ description: 'Page size' })
  limit!: number;
}

export class UserRoleListResponseDto {
  @ApiProperty({
    description: 'List of user roles',
    type: [UserRoleResponseDto],
  })
  userRoles!: UserRoleResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;
}

// Permission Check DTOs
export class CheckPermissionDto {
  @ApiProperty({ description: 'Resource to check' })
  @IsString()
  resource!: string;

  @ApiProperty({ description: 'Action to check' })
  @IsString()
  action!: string;

  @ApiPropertyOptional({ description: 'Scope to check' })
  @IsOptional()
  @IsEnum(PermissionScope)
  scope?: PermissionScope;
}

export class PermissionCheckResponseDto {
  @ApiProperty({ description: 'Whether user has permission' })
  hasPermission!: boolean;

  @ApiProperty({ description: 'Resource checked' })
  resource!: string;

  @ApiProperty({ description: 'Action checked' })
  action!: string;

  @ApiPropertyOptional({ description: 'Scope checked' })
  scope?: PermissionScope;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Roles that grant this permission' })
  grantedByRoles!: string[];
}
