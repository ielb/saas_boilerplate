import {
  IsOptional,
  IsString,
  IsEnum,
  IsUrl,
  IsObject,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProfilePrivacyLevel,
  ProfileCompletionStatus,
} from '../entities/user-profile.entity';

export class CreateProfileDto {
  @ApiPropertyOptional({ description: 'User first name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Display name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ description: 'User bio' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Job title', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Department', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ description: 'Location', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ description: 'Personal website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'LinkedIn profile URL' })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: 'Twitter profile URL' })
  @IsOptional()
  @IsUrl()
  twitterUrl?: string;

  @ApiPropertyOptional({ description: 'GitHub profile URL' })
  @IsOptional()
  @IsUrl()
  githubUrl?: string;

  @ApiPropertyOptional({
    description: 'Privacy level',
    enum: ProfilePrivacyLevel,
    default: ProfilePrivacyLevel.TENANT_ONLY,
  })
  @IsOptional()
  @IsEnum(ProfilePrivacyLevel)
  privacyLevel?: ProfilePrivacyLevel;

  @ApiPropertyOptional({ description: 'User preferences' })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateProfileDto extends CreateProfileDto {
  // Inherits all properties from CreateProfileDto
  // All properties are optional for updates
}

export class UploadAvatarDto {
  @ApiProperty({ description: 'Avatar image file' })
  file!: Express.Multer.File;
}

export class ProfileResponseDto {
  @ApiProperty({ description: 'Profile ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiPropertyOptional({ description: 'Tenant ID' })
  tenantId?: string;

  @ApiPropertyOptional({ description: 'First name' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  displayName?: string;

  @ApiPropertyOptional({ description: 'User bio' })
  bio?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Avatar file key' })
  avatarFileKey?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Job title' })
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Department' })
  department?: string;

  @ApiPropertyOptional({ description: 'Location' })
  location?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  website?: string;

  @ApiPropertyOptional({ description: 'LinkedIn URL' })
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: 'Twitter URL' })
  twitterUrl?: string;

  @ApiPropertyOptional({ description: 'GitHub URL' })
  githubUrl?: string;

  @ApiProperty({ description: 'Privacy level', enum: ProfilePrivacyLevel })
  privacyLevel!: ProfilePrivacyLevel;

  @ApiProperty({
    description: 'Completion status',
    enum: ProfileCompletionStatus,
  })
  completionStatus!: ProfileCompletionStatus;

  @ApiPropertyOptional({ description: 'User preferences' })
  preferences?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;
}

export class ProfileCompletionDto {
  @ApiProperty({
    description: 'Completion status',
    enum: ProfileCompletionStatus,
  })
  completionStatus!: ProfileCompletionStatus;

  @ApiProperty({ description: 'Completion percentage (0-100)' })
  completionPercentage!: number;

  @ApiProperty({ description: 'Missing required fields' })
  missingFields!: string[];

  @ApiProperty({ description: 'Total required fields' })
  totalRequiredFields!: number;

  @ApiProperty({ description: 'Completed required fields' })
  completedRequiredFields!: number;
}
