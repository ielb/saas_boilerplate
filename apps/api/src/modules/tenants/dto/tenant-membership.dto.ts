import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsDate,
  IsString,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserRole, MembershipStatus } from '@app/shared';

export class TenantMembershipDto {
  @ApiProperty({
    description: 'Unique identifier for the membership',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id!: string;

  @ApiProperty({
    description: 'Tenant information',
  })
  tenant!: {
    id: string;
    name: string;
    domain?: string;
    plan: string;
    features: string[];
    settings: Record<string, any>;
  };

  @ApiProperty({
    description: 'User role in this tenant',
    enum: UserRole,
    example: UserRole.MEMBER,
  })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({
    description: 'Membership status',
    enum: MembershipStatus,
    example: MembershipStatus.ACTIVE,
  })
  @IsEnum(MembershipStatus)
  status!: MembershipStatus;

  @ApiProperty({
    description: 'Date when user joined this tenant',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDate()
  @Type(() => Date)
  joinedAt!: Date;

  @ApiProperty({
    description: 'Date when user last accessed this tenant',
    example: '2024-08-03T14:20:00Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastAccessedAt?: Date;

  @ApiProperty({
    description: 'Date when membership expires (if applicable)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @ApiProperty({
    description: 'List of specific permissions for this membership',
    example: ['users:read', 'projects:write', 'billing:read'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  @ApiProperty({
    description: 'Whether this is the currently active tenant',
    example: true,
  })
  isCurrentTenant!: boolean;

  @ApiProperty({
    description: 'Whether the membership is currently active',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Whether the membership has expired',
    example: false,
  })
  isExpired!: boolean;
}

export class UserTenantMembershipsResponseDto {
  @ApiProperty({
    description: 'List of user tenant memberships',
    type: [TenantMembershipDto],
  })
  memberships!: TenantMembershipDto[];

  @ApiProperty({
    description: 'ID of the currently active tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  currentTenantId!: string;

  @ApiProperty({
    description: 'Total number of memberships',
    example: 3,
  })
  totalCount!: number;

  @ApiProperty({
    description: 'Number of active memberships',
    example: 2,
  })
  activeCount!: number;

  @ApiProperty({
    description: 'Number of pending memberships (invitations)',
    example: 1,
  })
  pendingCount!: number;
}

