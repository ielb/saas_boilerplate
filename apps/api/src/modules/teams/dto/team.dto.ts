import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
  IsUrl,
  IsArray,
  IsEmail,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeamStatus } from '../../teams/entities/team.entity';

export class CreateTeamDto {
  @ApiProperty({ description: 'Team name', example: 'Engineering Team' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Team description',
    example: 'Core engineering team responsible for product development',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Team manager user ID' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({
    description: 'Team settings',
    example: { allowPublicJoin: false, requireApproval: true },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Team avatar URL' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

export class UpdateTeamDto {
  @ApiPropertyOptional({
    description: 'Team name',
    example: 'Engineering Team',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Team description',
    example: 'Core engineering team responsible for product development',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Team manager user ID' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ description: 'Team status', enum: TeamStatus })
  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  @ApiPropertyOptional({
    description: 'Team settings',
    example: { allowPublicJoin: false, requireApproval: true },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Team avatar URL' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

export class TeamQueryDto {
  @ApiPropertyOptional({ description: 'Search by team name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: TeamStatus })
  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  @ApiPropertyOptional({ description: 'Filter by manager ID' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 10 })
  @IsOptional()
  limit?: number;
}

export class TeamResponseDto {
  @ApiProperty({ description: 'Team ID' })
  id!: string;

  @ApiProperty({ description: 'Team name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Team description' })
  description?: string | undefined;

  @ApiPropertyOptional({ description: 'Team manager ID' })
  managerId?: string;

  @ApiProperty({ description: 'Team status', enum: TeamStatus })
  status!: TeamStatus;

  @ApiPropertyOptional({ description: 'Team settings' })
  settings?: Record<string, any> | undefined;

  @ApiPropertyOptional({ description: 'Team avatar URL' })
  avatarUrl?: string | undefined;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Team manager details' })
  manager?:
    | {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      }
    | undefined;

  @ApiProperty({ description: 'Number of team members' })
  memberCount!: number;
}

export class AddTeamMemberDto {
  @ApiProperty({ description: 'User ID to add to team' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Role ID for the user in this team' })
  @IsUUID()
  @IsNotEmpty()
  roleId!: string;
}

export class UpdateTeamMemberDto {
  @ApiProperty({ description: 'New role ID for the user' })
  @IsUUID()
  @IsNotEmpty()
  roleId!: string;

  @ApiPropertyOptional({ description: 'Member status', enum: TeamStatus })
  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;
}

export class TeamMemberResponseDto {
  @ApiProperty({ description: 'Membership ID' })
  id!: string;

  @ApiProperty({ description: 'Team ID' })
  teamId!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Role ID' })
  roleId!: string;

  @ApiProperty({ description: 'Member status', enum: TeamStatus })
  status!: TeamStatus;

  @ApiPropertyOptional({ description: 'Join date' })
  joinedAt?: Date;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'User details' })
  user?:
    | {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string;
      }
    | undefined;

  @ApiPropertyOptional({ description: 'Role details' })
  role?:
    | {
        id: string;
        name: string;
        description?: string;
      }
    | undefined;
}

export class InviteTeamMemberDto {
  @ApiProperty({ description: 'Email address to invite' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Role ID for the invited user' })
  @IsUUID()
  @IsNotEmpty()
  roleId!: string;

  @ApiPropertyOptional({ description: 'Custom invitation message' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class TeamInvitationResponseDto {
  @ApiProperty({ description: 'Invitation ID' })
  id!: string;

  @ApiProperty({ description: 'Team ID' })
  teamId!: string;

  @ApiProperty({ description: 'Invited email' })
  email!: string;

  @ApiProperty({ description: 'Role ID' })
  roleId!: string;

  @ApiProperty({ description: 'Invitation status' })
  status!: 'pending' | 'accepted' | 'expired' | 'cancelled';

  @ApiProperty({ description: 'Expiration date' })
  expiresAt!: Date;

  @ApiPropertyOptional({ description: 'Acceptance date' })
  acceptedAt?: Date;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'Role details' })
  role?:
    | {
        id: string;
        name: string;
        description?: string;
      }
    | undefined;

  @ApiPropertyOptional({ description: 'Invited by user details' })
  invitedBy?:
    | {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      }
    | undefined;
}

export class AcceptTeamInvitationDto {
  @ApiProperty({ description: 'Invitation token' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class TeamAnalyticsDto {
  @ApiProperty({ description: 'Team ID' })
  teamId!: string;

  @ApiProperty({ description: 'Total members' })
  totalMembers!: number;

  @ApiProperty({ description: 'Active members' })
  activeMembers!: number;

  @ApiProperty({ description: 'Members by role' })
  membersByRole!: Record<string, number>;

  @ApiProperty({ description: 'Recent activity count' })
  recentActivityCount!: number;

  @ApiProperty({ description: 'Team creation date' })
  createdAt!: Date;
}
