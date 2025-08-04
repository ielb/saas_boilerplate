import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus, DeviceType } from '../entities/session.entity';

export class CreateSessionDto {
  @ApiProperty({ description: 'User ID for the session' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ description: 'Refresh token hash' })
  @IsOptional()
  @IsString()
  refreshTokenHash?: string;

  @ApiProperty({ description: 'Device fingerprint for security' })
  @IsString()
  deviceFingerprint!: string;

  @ApiProperty({ description: 'Device name (e.g., "John\'s iPhone")' })
  @IsString()
  deviceName!: string;

  @ApiProperty({ enum: DeviceType, description: 'Type of device' })
  @IsEnum(DeviceType)
  deviceType!: DeviceType;

  @ApiPropertyOptional({ description: 'Browser name' })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({ description: 'Browser version' })
  @IsOptional()
  @IsString()
  browserVersion?: string;

  @ApiPropertyOptional({ description: 'Operating system' })
  @IsOptional()
  @IsString()
  operatingSystem?: string;

  @ApiPropertyOptional({ description: 'OS version' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiProperty({ description: 'IP address of the device' })
  @IsString()
  ipAddress!: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Geographic location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Whether to remember this device' })
  @IsOptional()
  @IsBoolean()
  isRememberMe?: boolean;

  @ApiPropertyOptional({ description: 'Session expiration time' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateSessionDto {
  @ApiPropertyOptional({ description: 'Device name' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Whether device is trusted' })
  @IsOptional()
  @IsBoolean()
  isTrusted?: boolean;

  @ApiPropertyOptional({ description: 'Session status' })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RevokeSessionDto {
  @ApiPropertyOptional({ description: 'Reason for revoking the session' })
  @IsOptional()
  @IsString()
  reason?: string | undefined;
}

export class SessionResponseDto {
  @ApiProperty({ description: 'Session ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Device fingerprint' })
  deviceFingerprint!: string | null;

  @ApiProperty({ description: 'Device name' })
  deviceName!: string;

  @ApiProperty({ enum: DeviceType, description: 'Device type' })
  deviceType!: DeviceType;

  @ApiPropertyOptional({ description: 'Browser name' })
  browser?: string | null;

  @ApiPropertyOptional({ description: 'Browser version' })
  browserVersion?: string | null;

  @ApiPropertyOptional({ description: 'Operating system' })
  operatingSystem?: string | null;

  @ApiPropertyOptional({ description: 'OS version' })
  osVersion?: string | null;

  @ApiProperty({ description: 'IP address' })
  ipAddress!: string;

  @ApiPropertyOptional({ description: 'Geographic location' })
  location?: string | null;

  @ApiPropertyOptional({ description: 'Timezone' })
  timezone?: string | null;

  @ApiProperty({ enum: SessionStatus, description: 'Session status' })
  status!: SessionStatus;

  @ApiProperty({ description: 'Whether device is trusted' })
  isTrusted!: boolean;

  @ApiProperty({ description: 'Whether remember me is enabled' })
  isRememberMe!: boolean;

  @ApiProperty({ description: 'Last activity timestamp' })
  lastActivityAt!: Date;

  @ApiProperty({ description: 'Session expiration timestamp' })
  expiresAt!: Date;

  @ApiPropertyOptional({ description: 'Revocation timestamp' })
  revokedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Revocation reason' })
  revokedReason?: string | null;

  @ApiProperty({ description: 'Session creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Session update timestamp' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Whether session is currently active' })
  isActive!: boolean;
}

export class SessionListResponseDto {
  @ApiProperty({ type: [SessionResponseDto], description: 'List of sessions' })
  sessions!: SessionResponseDto[];

  @ApiProperty({ description: 'Total number of sessions' })
  total!: number;

  @ApiProperty({ description: 'Number of active sessions' })
  activeCount!: number;

  @ApiProperty({ description: 'Number of trusted devices' })
  trustedCount!: number;
}

export class DeviceInfoDto {
  @ApiProperty({ description: 'Device fingerprint' })
  deviceFingerprint!: string;

  @ApiProperty({ description: 'Device name' })
  deviceName!: string;

  @ApiProperty({ enum: DeviceType, description: 'Device type' })
  deviceType!: DeviceType;

  @ApiPropertyOptional({ description: 'Browser information' })
  browser?: string;

  @ApiPropertyOptional({ description: 'Operating system' })
  operatingSystem?: string;

  @ApiProperty({ description: 'IP address' })
  ipAddress!: string;

  @ApiPropertyOptional({ description: 'Geographic location' })
  location?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  timezone?: string;
}
