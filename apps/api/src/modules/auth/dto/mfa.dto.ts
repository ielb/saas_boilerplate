import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
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
