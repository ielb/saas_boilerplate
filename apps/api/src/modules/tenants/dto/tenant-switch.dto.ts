import { IsUUID, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TenantSwitchDto {
  @ApiProperty({
    description: 'The ID of the tenant to switch to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty({
    description: 'Optional reason for switching (for audit logging)',
    example: 'Switching to work on project X',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class TenantSwitchResponseDto {
  @ApiProperty({
    description: 'Success status of the switch operation',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'Successfully switched to tenant: Acme Corp',
  })
  message!: string;

  @ApiProperty({
    description: 'The new tenant context information',
  })
  tenantContext!: {
    id: string;
    name: string;
    domain?: string;
    plan: string;
    features: string[];
    settings: Record<string, any>;
  };

  @ApiProperty({
    description: 'User membership information in the new tenant',
  })
  membership!: {
    role: string;
    status: string;
    joinedAt: Date;
    lastAccessedAt?: Date;
    permissions: string[];
  };

  @ApiProperty({
    description: 'New JWT token with updated tenant context',
  })
  accessToken!: string;
}

