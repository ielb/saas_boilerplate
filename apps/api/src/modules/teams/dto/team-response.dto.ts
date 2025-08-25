import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeamResponseDto {
  @ApiProperty({ description: 'Team unique identifier' })
  id!: string;

  @ApiProperty({ description: 'Team name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Team description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Team color or theme' })
  color?: string;

  @ApiPropertyOptional({ description: 'Team icon or avatar URL' })
  iconUrl?: string;

  @ApiProperty({ description: 'Team status' })
  status!: string;

  @ApiProperty({ description: 'Team creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Team last update date' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Team members count' })
  membersCount?: number;
}
