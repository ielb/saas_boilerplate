import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  DelegationType,
  DelegationStatus,
} from '../entities/delegation.entity';

export class CreateDelegationDto {
  @IsUUID()
  @IsNotEmpty()
  delegateId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(DelegationType)
  @IsNotEmpty()
  delegationType!: DelegationType;

  @IsDateString()
  @IsNotEmpty()
  expiresAt!: Date;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  permissionIds?: string[];

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @IsUUID()
  @IsOptional()
  approverId?: string;

  @IsBoolean()
  @IsOptional()
  isEmergency?: boolean;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  recurrencePattern?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateDelegationDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: Date;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  permissionIds?: string[];

  @IsBoolean()
  @IsOptional()
  isEmergency?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ApproveDelegationDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  approvalNotes?: string;
}

export class RejectDelegationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  rejectionReason!: string;
}

export class RevokeDelegationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  revocationReason!: string;
}

export class ActivateDelegationDto {
  @IsBoolean()
  @IsOptional()
  confirmActivation?: boolean;
}

export class DelegationQueryDto {
  @IsEnum(DelegationStatus)
  @IsOptional()
  status?: DelegationStatus;

  @IsEnum(DelegationType)
  @IsOptional()
  delegationType?: DelegationType;

  @IsUUID()
  @IsOptional()
  delegatorId?: string;

  @IsUUID()
  @IsOptional()
  delegateId?: string;

  @IsUUID()
  @IsOptional()
  approverId?: string;

  @IsBoolean()
  @IsOptional()
  isEmergency?: boolean;

  @IsBoolean()
  @IsOptional()
  isExpired?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}

export class DelegationResponseDto {
  id!: string;
  tenantId!: string;
  delegatorId!: string;
  delegateId!: string;
  approverId?: string;
  title!: string;
  description?: string;
  delegationType!: DelegationType;
  status!: DelegationStatus;
  requestedAt!: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  revokedAt?: Date;
  expiresAt!: Date;
  activatedAt?: Date;
  approvalNotes?: string;
  rejectionReason?: string;
  revocationReason?: string;
  requiresApproval!: boolean;
  isEmergency!: boolean;
  isRecurring!: boolean;
  recurrencePattern?: string;
  metadata?: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;

  // Computed fields
  isActive!: boolean;
  isExpired!: boolean;
  remainingTimeInHours!: number;
  durationInHours!: number;
  permissionNames!: string[];

  // Related entities
  delegator?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  delegate?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  approver?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  permissions?: Array<{
    id: string;
    name: string;
    resource: string;
    action: string;
    scope: string;
  }>;
}

export class DelegationAuditLogResponseDto {
  id!: string;
  delegationId!: string;
  userId!: string;
  action!: string;
  details?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt!: Date;

  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };
}

export class DelegationStatsDto {
  totalDelegations!: number;
  activeDelegations!: number;
  pendingApprovals!: number;
  expiredDelegations!: number;
  revokedDelegations!: number;
  emergencyDelegations!: number;
  delegationsThisMonth!: number;
  averageDelegationDuration!: number;
}

export class DelegationPermissionDto {
  @IsUUID()
  @IsNotEmpty()
  permissionId!: string;

  @IsString()
  @IsNotEmpty()
  permissionName!: string;

  @IsString()
  @IsNotEmpty()
  resource!: string;

  @IsString()
  @IsNotEmpty()
  action!: string;

  @IsString()
  @IsNotEmpty()
  scope!: string;
}

export class DelegationSummaryDto {
  id!: string;
  title!: string;
  status!: DelegationStatus;
  delegationType!: DelegationType;
  requestedAt!: Date;
  expiresAt!: Date;
  isEmergency!: boolean;
  isActive!: boolean;
  isExpired!: boolean;
  remainingTimeInHours!: number;

  delegator!: {
    id: string;
    fullName: string;
  };

  delegate!: {
    id: string;
    fullName: string;
  };

  approver?: {
    id: string;
    fullName: string;
  };

  permissionCount!: number;
}
