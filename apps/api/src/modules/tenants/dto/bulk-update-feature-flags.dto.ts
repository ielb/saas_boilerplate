import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FeatureFlagUpdateDto {
  @ApiProperty({
    description: 'Feature name (use snake_case format)',
    example: 'mfa_enforcement',
  })
  feature!: string;

  @ApiProperty({
    description: 'Whether the feature is enabled',
    example: true,
  })
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({
    description: 'Feature configuration',
    example: { maxRetries: 3, timeout: 5000 },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class BulkUpdateFeatureFlagsDto {
  @ApiProperty({
    description: 'Array of feature flag updates',
    type: [FeatureFlagUpdateDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureFlagUpdateDto)
  updates!: FeatureFlagUpdateDto[];
}
