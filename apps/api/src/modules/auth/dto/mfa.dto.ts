import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetupMfaDto {
  @ApiProperty({
    description: 'User ID for setting up MFA',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class EnableMfaDto {
  @ApiProperty({
    description: 'TOTP verification code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class DisableMfaDto {
  @ApiProperty({
    description: 'TOTP verification code to disable MFA',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class VerifyMfaDto {
  @ApiProperty({
    description: 'TOTP verification code or backup code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description: 'User ID for verification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class RegenerateBackupCodesDto {
  @ApiProperty({
    description: 'TOTP verification code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class MfaStatusDto {
  @ApiProperty({
    description: 'Whether MFA is enabled',
    example: true,
  })
  isEnabled!: boolean;

  @ApiProperty({
    description: 'Whether MFA is verified',
    example: true,
  })
  isVerified!: boolean;

  @ApiProperty({
    description: 'Number of remaining backup codes',
    example: 10,
  })
  backupCodesRemaining!: number;
}

// New DTOs for Account Recovery
export class InitiateAccountRecoveryDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class VerifyAccountRecoveryDto {
  @ApiProperty({
    description: 'Recovery token sent to email',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  recoveryToken!: string;

  @ApiProperty({
    description: 'Backup code for account recovery',
    example: 'ABCD1234EF',
  })
  @IsString()
  @IsNotEmpty()
  backupCode!: string;
}

export class CompleteAccountRecoveryDto {
  @ApiProperty({
    description: 'Recovery session token',
    example: 'xyz789abc123',
  })
  @IsString()
  @IsNotEmpty()
  recoverySessionToken!: string;

  @ApiProperty({
    description: 'New TOTP secret (optional, will generate if not provided)',
    example: 'JBSWY3DPEHPK3PXP',
    required: false,
  })
  @IsString()
  @IsOptional()
  newTotpSecret?: string;
}

export class AccountRecoveryStatusDto {
  @ApiProperty({
    description: 'Whether recovery is in progress',
    example: true,
  })
  isRecoveryInProgress!: boolean;

  @ApiProperty({
    description: 'Recovery session expiry time',
    example: '2023-12-31T23:59:59Z',
  })
  recoverySessionExpiresAt!: string;

  @ApiProperty({
    description: 'Number of remaining recovery attempts',
    example: 3,
  })
  remainingAttempts!: number;
}

export class RecoveryAttemptDto {
  @ApiProperty({
    description: 'Recovery session token',
    example: 'xyz789abc123',
  })
  @IsString()
  @IsNotEmpty()
  recoverySessionToken!: string;

  @ApiProperty({
    description: 'Backup code attempt',
    example: 'ABCD1234EF',
  })
  @IsString()
  @IsNotEmpty()
  backupCode!: string;
}
