import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TenantAccessVerificationDto {
  @ApiProperty({
    description: 'The ID of the tenant to verify access for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty({
    description: 'Optional specific permissions to check',
    example: ['users:read', 'projects:write'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiProperty({
    description: 'Optional resource to check access for',
    example: 'project:123',
    required: false,
  })
  @IsOptional()
  @IsString()
  resource?: string;
}

export class TenantAccessResponseDto {
  @ApiProperty({
    description: 'Whether the user has access to the tenant',
    example: true,
  })
  @IsBoolean()
  hasAccess!: boolean;

  @ApiProperty({
    description: 'The user role in the tenant (if has access)',
    example: 'member',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({
    description: 'The membership status (if has access)',
    example: 'active',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'List of permissions the user has in this tenant',
    example: ['users:read', 'projects:read', 'projects:write'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  @ApiProperty({
    description: 'Specific permission check results (if requested)',
    example: {
      'users:read': true,
      'projects:write': true,
      'billing:admin': false,
    },
    required: false,
  })
  @IsOptional()
  permissionChecks?: Record<string, boolean>;

  @ApiProperty({
    description: 'Reason for access denial (if hasAccess is false)',
    example: 'User is not a member of this tenant',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description: 'Tenant information (if has access)',
    required: false,
  })
  @IsOptional()
  tenant?: {
    id: string;
    name: string;
    domain?: string;
    plan: string;
    features: string[];
  };
}

export class BulkTenantAccessDto {
  @ApiProperty({
    description: 'List of tenant IDs to check access for',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '987fcdeb-51a2-43d1-b789-123456789abc',
    ],
    type: [String],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  tenantIds!: string[];

  @ApiProperty({
    description: 'Optional permissions to check for all tenants',
    example: ['users:read', 'projects:write'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class BulkTenantAccessResponseDto {
  @ApiProperty({
    description: 'Access results for each tenant',
    example: {
      '123e4567-e89b-12d3-a456-426614174000': {
        hasAccess: true,
        role: 'admin',
        status: 'active',
        permissions: ['users:read', 'users:write', 'projects:admin'],
      },
      '987fcdeb-51a2-43d1-b789-123456789abc': {
        hasAccess: false,
        reason: 'User is not a member of this tenant',
        permissions: [],
      },
    },
  })
  results!: Record<string, TenantAccessResponseDto>;

  @ApiProperty({
    description: 'Summary of access check results',
  })
  summary!: {
    totalChecked: number;
    accessGranted: number;
    accessDenied: number;
  };
}

