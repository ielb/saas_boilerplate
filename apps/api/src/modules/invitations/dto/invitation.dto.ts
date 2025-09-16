import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InvitationType,
  InvitationStatus,
} from '../entities/invitation.entity';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email address of the person to invite',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Type of invitation',
    enum: InvitationType,
    default: InvitationType.TEAM_MEMBER,
  })
  @IsOptional()
  @IsEnum(InvitationType)
  type?: InvitationType;

  @ApiPropertyOptional({
    description: 'Role ID to assign to the invited user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Personal message to include with the invitation',
    maxLength: 500,
    example: "Welcome to our team! We're excited to have you join us.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class UpdateInvitationDto {
  @ApiPropertyOptional({
    description: 'Type of invitation',
    enum: InvitationType,
  })
  @IsOptional()
  @IsEnum(InvitationType)
  type?: InvitationType;

  @ApiPropertyOptional({
    description: 'Role ID to assign to the invited user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Personal message to include with the invitation',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class InvitationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by invitation status',
    enum: InvitationStatus,
  })
  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: InvitationStatus;

  @ApiPropertyOptional({
    description: 'Filter by invitation type',
    enum: InvitationType,
  })
  @IsOptional()
  @IsEnum(InvitationType)
  type?: InvitationType;

  @ApiPropertyOptional({
    description: 'Filter by email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'First name of the user accepting the invitation',
    example: 'John',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({
    description: 'Last name of the user accepting the invitation',
    example: 'Doe',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({
    description: 'Password for the new account',
    example: 'SecurePassword123!',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class InvitationResponseDto {
  @ApiProperty({
    description: 'Invitation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Email address of the invited person',
    example: 'john.doe@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Type of invitation',
    enum: InvitationType,
  })
  type!: InvitationType;

  @ApiProperty({
    description: 'Current status of the invitation',
    enum: InvitationStatus,
  })
  status!: InvitationStatus;

  @ApiPropertyOptional({
    description: 'Personal message included with the invitation',
  })
  message?: string;

  @ApiProperty({
    description: 'When the invitation expires',
    example: '2024-01-15T10:30:00Z',
  })
  expiresAt!: Date;

  @ApiPropertyOptional({
    description: 'When the invitation was accepted',
    example: '2024-01-10T14:30:00Z',
  })
  acceptedAt?: Date;

  @ApiPropertyOptional({
    description: 'When the invitation was revoked',
    example: '2024-01-12T09:15:00Z',
  })
  revokedAt?: Date;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId!: string;

  @ApiProperty({
    description: 'ID of the user who sent the invitation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  invitedById!: string;

  @ApiPropertyOptional({
    description: 'Role ID assigned to the invitation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  roleId?: string;

  @ApiPropertyOptional({
    description: 'ID of the user who accepted the invitation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  acceptedById?: string;

  @ApiProperty({
    description: 'When the invitation was created',
    example: '2024-01-01T10:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When the invitation was last updated',
    example: '2024-01-01T10:00:00Z',
  })
  updatedAt!: Date;

  // Computed properties
  @ApiProperty({
    description: 'Whether the invitation is expired',
    example: false,
  })
  isExpired!: boolean;

  @ApiProperty({
    description: 'Whether the invitation can be accepted',
    example: true,
  })
  canBeAccepted!: boolean;

  @ApiProperty({
    description: 'Whether the invitation can be revoked',
    example: true,
  })
  canBeRevoked!: boolean;
}

export class InvitationStatsDto {
  @ApiProperty({
    description: 'Total number of invitations',
    example: 150,
  })
  total!: number;

  @ApiProperty({
    description: 'Number of pending invitations',
    example: 25,
  })
  pending!: number;

  @ApiProperty({
    description: 'Number of accepted invitations',
    example: 100,
  })
  accepted!: number;

  @ApiProperty({
    description: 'Number of expired invitations',
    example: 20,
  })
  expired!: number;

  @ApiProperty({
    description: 'Number of revoked invitations',
    example: 5,
  })
  revoked!: number;

  @ApiProperty({
    description: 'Acceptance rate percentage',
    example: 66.67,
  })
  acceptanceRate!: number;
}
