import {
  IsUUID,
  IsOptional,
  IsBoolean,
  IsString,
  IsDate,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeamStatus } from '../entities/team.entity';

export class TeamSwitchDto {
  @ApiProperty({
    description: 'ID of the team to switch to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  teamId!: string;

  @ApiPropertyOptional({
    description: 'Whether to notify team members of the switch',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyTeamMembers?: boolean;
}

export class TeamMembershipDto {
  @ApiProperty({
    description: 'Team ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Team name',
    example: 'Development Team',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Team description',
    example: 'Core development team for the main product',
  })
  description?: string;

  @ApiProperty({
    description: 'Team status',
    enum: TeamStatus,
    example: TeamStatus.ACTIVE,
  })
  status!: TeamStatus;

  @ApiPropertyOptional({
    description: 'Team avatar URL',
    example: 'https://example.com/avatars/team-1.png',
  })
  avatarUrl?: string;

  @ApiProperty({
    description: 'User membership information in this team',
  })
  membership!: {
    id: string;
    roleId: string;
    roleName: string;
    status: TeamStatus;
    joinedAt: Date;
    lastAccessedAt?: Date;
  };

  @ApiProperty({
    description: 'Number of members in the team',
    example: 8,
  })
  memberCount!: number;
}

export class TeamSwitchResponseDto {
  @ApiProperty({
    description: 'Whether the team switch was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Successfully switched to team "Development Team"',
  })
  message!: string;

  @ApiProperty({
    description: 'Team information',
  })
  team!: {
    id: string;
    name: string;
    description?: string;
    status: TeamStatus;
    avatarUrl?: string;
  };

  @ApiProperty({
    description: 'User membership information in the team',
  })
  membership!: {
    id: string;
    roleId: string;
    roleName: string;
    status: TeamStatus;
    joinedAt: Date;
    lastAccessedAt?: Date;
  };

  @ApiProperty({
    description: 'New JWT token with updated team context',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;
}

export class UserTeamMembershipsResponseDto {
  @ApiProperty({
    description: 'List of teams where the user is a member',
    type: [TeamMembershipDto],
  })
  teams!: TeamMembershipDto[];

  @ApiProperty({
    description: 'Total number of teams',
    example: 5,
  })
  total!: number;
}

export class CurrentTeamContextDto {
  @ApiProperty({
    description: 'Current team information',
  })
  team!: {
    id: string;
    name: string;
    description?: string;
    status: TeamStatus;
    avatarUrl?: string;
  };

  @ApiProperty({
    description: 'User membership information in the current team',
  })
  membership!: {
    id: string;
    roleId: string;
    roleName: string;
    status: TeamStatus;
    joinedAt: Date;
    lastAccessedAt?: Date;
  };
}

export class TeamAccessVerificationDto {
  @ApiProperty({
    description: 'Whether the user has access to the team',
    example: true,
  })
  hasAccess!: boolean;

  @ApiPropertyOptional({
    description: 'Team information if access is granted',
  })
  team?: {
    id: string;
    name: string;
    description?: string;
    status: TeamStatus;
  };

  @ApiPropertyOptional({
    description: 'Membership information if access is granted',
  })
  membership?: {
    id: string;
    roleId: string;
    roleName: string;
    status: TeamStatus;
    joinedAt: Date;
  };
}

export class AvailableTeamDto {
  @ApiProperty({
    description: 'Team ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Team name',
    example: 'Development Team',
  })
  name!: string;

  @ApiProperty({
    description: 'User role in this team',
    example: 'Developer',
  })
  role!: string;
}

export class AvailableTeamsDto {
  @ApiProperty({
    description: 'List of teams available for switching',
    type: [AvailableTeamDto],
  })
  teams!: AvailableTeamDto[];
}
