import { IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeatureFlagDto {
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
