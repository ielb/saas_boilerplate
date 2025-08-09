import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  Matches,
  IsNumber,
  Min,
  Max,
  IsEnum,
  ValidateNested,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum OnboardingStep {
  TENANT_SETUP = 'tenant_setup',
  ADMIN_USER_CREATION = 'admin_user_creation',
  PLAN_SELECTION = 'plan_selection',
  PAYMENT_SETUP = 'payment_setup',
  FEATURE_CONFIGURATION = 'feature_configuration',
  VERIFICATION = 'verification',
  COMPLETION = 'completion',
}

export enum OnboardingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class AdminUserDto {
  @ApiProperty({
    description: 'Admin user first name',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({
    description: 'Admin user last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({
    description: 'Admin user email address',
    example: 'admin@acme.com',
  })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({
    description: 'Admin user phone number',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Admin user job title',
    example: 'CEO',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiProperty({
    description:
      'Admin user password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password!: string;
}

export class TenantOnboardingDto {
  @ApiProperty({
    description: 'Tenant name',
    example: 'Acme Corporation',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    description: 'Custom domain for the tenant',
    example: 'acme.example.com',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    {
      message: 'Domain must be a valid domain name (e.g., example.com)',
    }
  )
  @MaxLength(255)
  domain?: string;

  @ApiProperty({
    description: 'Admin user information',
    type: AdminUserDto,
  })
  @ValidateNested()
  @Type(() => AdminUserDto)
  adminUser!: AdminUserDto;

  @ApiPropertyOptional({
    description: 'Tenant description',
    example: 'A leading technology company',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Industry or business sector',
    example: 'Technology',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Company size range',
    example: '50-100',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  companySize?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'contact@acme.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Street address',
    example: '123 Main Street',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'San Francisco',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'State or province',
    example: 'CA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '94105',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Timezone',
    example: 'America/Los_Angeles',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Locale',
    example: 'en-US',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Subscription plan',
    example: 'pro',
    default: 'free',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  plan?: string;

  @ApiPropertyOptional({
    description: 'Requested features for the tenant',
    example: ['advanced_analytics', 'email_templates'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  requestedFeatures?: string[];

  @ApiPropertyOptional({
    description: 'Whether to send welcome email',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendWelcomeEmail?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to auto-verify the tenant',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoVerify?: boolean;

  @ApiPropertyOptional({
    description: 'Trial period in days (0 for no trial)',
    example: 30,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  trialDays?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata for the onboarding process',
    example: { source: 'website', campaign: 'summer2024' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class OnboardingStepUpdateDto {
  @ApiProperty({
    description: 'Current onboarding step',
    enum: OnboardingStep,
    example: OnboardingStep.TENANT_SETUP,
  })
  @IsEnum(OnboardingStep)
  step!: OnboardingStep;

  @ApiProperty({
    description: 'Step status',
    enum: OnboardingStatus,
    example: OnboardingStatus.COMPLETED,
  })
  @IsEnum(OnboardingStatus)
  status!: OnboardingStatus;

  @ApiPropertyOptional({
    description: 'Step completion data',
    example: { tenantId: 'uuid', adminUserId: 'uuid' },
  })
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Error message if step failed',
    example: 'Email verification failed',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  errorMessage?: string;
}

export class OnboardingProgressDto {
  @ApiProperty({
    description: 'Onboarding session ID',
    example: 'uuid',
  })
  @IsUUID()
  onboardingId!: string;

  @ApiProperty({
    description: 'Current step in the onboarding process',
    enum: OnboardingStep,
    example: OnboardingStep.ADMIN_USER_CREATION,
  })
  @IsEnum(OnboardingStep)
  currentStep!: OnboardingStep;

  @ApiProperty({
    description: 'Overall onboarding status',
    enum: OnboardingStatus,
    example: OnboardingStatus.IN_PROGRESS,
  })
  @IsEnum(OnboardingStatus)
  status!: OnboardingStatus;

  @ApiProperty({
    description: 'Completed steps',
    type: [String],
    example: [OnboardingStep.TENANT_SETUP, OnboardingStep.ADMIN_USER_CREATION],
  })
  @IsArray()
  @IsEnum(OnboardingStep, { each: true })
  completedSteps!: OnboardingStep[];

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    example: 42,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage!: number;

  @ApiPropertyOptional({
    description: 'Created tenant ID if tenant step is completed',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'Created admin user ID if user step is completed',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  adminUserId?: string;

  @ApiPropertyOptional({
    description: 'Estimated completion time',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  estimatedCompletion?: Date;

  @ApiPropertyOptional({
    description: 'Next recommended action',
    example: 'Please verify your email address to continue',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nextAction?: string;
}

export class VerifyOnboardingDto {
  @ApiProperty({
    description: 'Onboarding session ID',
    example: 'uuid',
  })
  @IsUUID()
  onboardingId!: string;

  @ApiProperty({
    description: 'Verification token from email',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(255)
  verificationToken!: string;
}

export class ResendVerificationDto {
  @ApiProperty({
    description: 'Onboarding session ID',
    example: 'uuid',
  })
  @IsUUID()
  onboardingId!: string;

  @ApiPropertyOptional({
    description:
      'Email address to send verification to (defaults to admin user email)',
    example: 'admin@acme.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CancelOnboardingDto {
  @ApiProperty({
    description: 'Onboarding session ID',
    example: 'uuid',
  })
  @IsUUID()
  onboardingId!: string;

  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'User decided not to proceed',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Whether to cleanup created resources',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  cleanup?: boolean;
}

export class OnboardingResponseDto {
  @ApiProperty({
    description: 'Onboarding session ID',
    example: 'uuid',
  })
  onboardingId!: string;

  @ApiProperty({
    description: 'Current onboarding status',
    enum: OnboardingStatus,
    example: OnboardingStatus.IN_PROGRESS,
  })
  status!: OnboardingStatus;

  @ApiProperty({
    description: 'Current step',
    enum: OnboardingStep,
    example: OnboardingStep.TENANT_SETUP,
  })
  currentStep!: OnboardingStep;

  @ApiProperty({
    description: 'Progress percentage',
    example: 14,
  })
  progressPercentage!: number;

  @ApiProperty({
    description: 'Next action required',
    example: 'Please check your email for verification instructions',
  })
  nextAction!: string;

  @ApiPropertyOptional({
    description: 'Created tenant ID',
    example: 'uuid',
  })
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'Created admin user ID',
    example: 'uuid',
  })
  adminUserId?: string;

  @ApiProperty({
    description: 'Estimated completion time',
    example: '2024-01-15T10:30:00Z',
  })
  estimatedCompletion!: Date;
}
