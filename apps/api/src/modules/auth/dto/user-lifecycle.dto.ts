import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@app/shared';

export class RegisterUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Send email verification',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendEmailVerification?: boolean;

  @ApiPropertyOptional({
    description: 'Send welcome email',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sendWelcomeEmail?: boolean;
}

export class ActivateUserDto {
  @ApiPropertyOptional({
    description: 'Skip email verification during activation',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipEmailVerification?: boolean;

  @ApiPropertyOptional({
    description: 'Custom audit event name',
    example: 'user.activated_by_admin',
  })
  @IsOptional()
  @IsString()
  auditEvent?: string;
}

export class SuspendUserDto {
  @ApiPropertyOptional({
    description: 'Reason for suspension',
    example: 'Violation of terms of service',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Suspension duration in days (null for indefinite)',
    example: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Custom audit event name',
    example: 'user.suspended_by_admin',
  })
  @IsOptional()
  @IsString()
  auditEvent?: string;
}

export class ReactivateUserDto {
  @ApiPropertyOptional({
    description: 'Custom audit event name',
    example: 'user.reactivated_by_admin',
  })
  @IsOptional()
  @IsString()
  auditEvent?: string;
}

export class DeleteUserDto {
  @ApiPropertyOptional({
    description: 'Custom audit event name',
    example: 'user.deleted_by_admin',
  })
  @IsOptional()
  @IsString()
  auditEvent?: string;
}

export class UserLifecycleResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName!: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName!: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  fullName!: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
  })
  role!: UserRole;

  @ApiProperty({
    description: 'User status',
    enum: UserStatus,
  })
  status!: UserStatus;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId!: string;

  @ApiProperty({
    description: 'Email verification status',
  })
  emailVerified!: boolean;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatar?: string;

  @ApiProperty({
    description: 'Account creation date',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update date',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Last login date',
  })
  lastLoginAt?: Date;

  @ApiPropertyOptional({
    description: 'Last login IP address',
  })
  lastLoginIp?: string;
}

export class UserLifecycleInfoResponseDto extends UserLifecycleResponseDto {
  @ApiProperty({
    description: 'Whether user is active',
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Whether user is suspended',
  })
  isSuspended!: boolean;

  @ApiProperty({
    description: 'Whether user is deleted',
  })
  isDeleted!: boolean;

  @ApiPropertyOptional({
    description: 'Suspension information',
  })
  suspensionInfo?: {
    suspendedAt: Date;
    reason: string;
    expiresAt?: Date;
    isExpired: boolean;
  };
}

export class BulkUserOperationDto {
  @ApiProperty({
    description: 'Array of user IDs to perform operation on',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '987fcdeb-51a2-43d1-b789-123456789abc',
    ],
  })
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  userIds!: string[];

  @ApiPropertyOptional({
    description: 'Custom audit event name',
    example: 'users.bulk_activated_by_admin',
  })
  @IsOptional()
  @IsString()
  auditEvent?: string;
}

export class BulkUserOperationResponseDto {
  @ApiProperty({
    description: 'Number of users successfully processed',
    example: 5,
  })
  successCount!: number;

  @ApiProperty({
    description: 'Number of users that failed to process',
    example: 2,
  })
  failureCount!: number;

  @ApiProperty({
    description: 'Array of user IDs that were successfully processed',
  })
  successfulUserIds!: string[];

  @ApiProperty({
    description: 'Array of errors for failed operations',
  })
  errors!: Array<{
    userId: string;
    error: string;
  }>;
}
