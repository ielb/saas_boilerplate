import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TeamRepository } from '../repositories/team.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { AuditService } from '../../audit/services/audit.service';
import { EmailService } from '../../email/services/email.service';
import { JwtService } from '../../auth/services/jwt.service';
import { Team, TeamMembership, TeamStatus } from '../entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { AuditEventType } from '../../audit/entities/audit-log.entity';
import {
  TeamSwitchDto,
  TeamSwitchResponseDto,
  UserTeamMembershipsResponseDto,
  CurrentTeamContextDto,
} from '../dto/team-switch.dto';

@Injectable()
export class TeamSwitchingService {
  private readonly logger = new Logger(TeamSwitchingService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Get all teams where the user is a member
   */
  async getUserTeamMemberships(
    userId: string,
    tenantId: string
  ): Promise<UserTeamMembershipsResponseDto> {
    this.logger.debug(`Getting team memberships for user: ${userId}`);

    const result = await this.teamRepository.findUserTeamsWithMemberships(
      userId,
      tenantId
    );

    return {
      teams: result.teams.map(team => ({
        id: team.id,
        name: team.name,
        ...(team.description && { description: team.description }),
        status: team.status,
        ...(team.avatarUrl && { avatarUrl: team.avatarUrl }),
        membership: {
          id: team.membership.id,
          roleId: team.membership.roleId,
          roleName: team.membership.role?.name || 'Unknown',
          status: team.membership.status,
          joinedAt: team.membership.joinedAt!,
          ...(team.membership.lastAccessedAt && { lastAccessedAt: team.membership.lastAccessedAt }),
        },
        memberCount: team.memberCount || 0,
      })),
      total: result.total,
    };
  }

  /**
   * Get current team context for user
   */
  async getCurrentTeamContext(
    userId: string,
    tenantId: string
  ): Promise<CurrentTeamContextDto> {
    this.logger.debug(`Getting current team context for user: ${userId}`);

    const user = await this.userRepository.findOneByIdForTenant(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's current team from session or default to first team
    const currentTeamId = (user as any).currentTeamId;

    if (currentTeamId) {
      const membership = await this.teamRepository.findTeamMember(
        currentTeamId,
        userId,
        tenantId
      );

      if (membership && membership.status === TeamStatus.ACTIVE) {
        const team = await this.teamRepository.findTeamWithDetails(
          currentTeamId,
          tenantId
        );

        if (team) {
                  return {
          team: {
            id: team.id,
            name: team.name,
            ...(team.description && { description: team.description }),
            status: team.status,
            ...(team.avatarUrl && { avatarUrl: team.avatarUrl }),
          },
          membership: {
            id: membership.id,
            roleId: membership.roleId,
            roleName: membership.role?.name || 'Unknown',
            status: membership.status,
            joinedAt: membership.joinedAt!,
            ...(membership.lastAccessedAt && { lastAccessedAt: membership.lastAccessedAt }),
          },
        };
        }
      }
    }

    // If no current team or invalid, get first available team
    const userTeams = await this.teamRepository.findUserTeams(userId, tenantId);
    if (userTeams.length === 0) {
      throw new NotFoundException('User is not a member of any teams');
    }

    const firstTeam = userTeams[0];
    if (!firstTeam) {
      throw new NotFoundException('No teams available');
    }

    const firstMembership = await this.teamRepository.findTeamMember(
      firstTeam.id,
      userId,
      tenantId
    );

    if (!firstMembership) {
      throw new NotFoundException('User membership not found');
    }

    return {
      team: {
        id: firstTeam.id,
        name: firstTeam.name,
        ...(firstTeam.description && { description: firstTeam.description }),
        status: firstTeam.status,
        ...(firstTeam.avatarUrl && { avatarUrl: firstTeam.avatarUrl }),
      },
      membership: {
        id: firstMembership.id,
        roleId: firstMembership.roleId,
        roleName: firstMembership.role?.name || 'Unknown',
        status: firstMembership.status,
        joinedAt: firstMembership.joinedAt!,
        ...(firstMembership.lastAccessedAt && { lastAccessedAt: firstMembership.lastAccessedAt }),
      },
    };
  }

  /**
   * Switch user's current team context
   */
  async switchTeam(
    userId: string,
    switchDto: TeamSwitchDto,
    tenantId: string
  ): Promise<TeamSwitchResponseDto> {
    this.logger.debug(
      `User ${userId} attempting to switch to team: ${switchDto.teamId}`
    );

    return await this.dataSource.transaction(async manager => {
      // Verify user has access to the target team
      const membership = await this.teamRepository.findTeamMember(
        switchDto.teamId,
        userId,
        tenantId
      );

      if (!membership) {
        this.logger.warn(
          `User ${userId} attempted to switch to unauthorized team: ${switchDto.teamId}`
        );
        throw new ForbiddenException('You do not have access to this team');
      }

      if (membership.status !== TeamStatus.ACTIVE) {
        throw new ForbiddenException(
          'Your membership to this team is not active'
        );
      }

      // Get team details
      const team = await this.teamRepository.findTeamWithDetails(
        switchDto.teamId,
        tenantId
      );

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      // Get user and update current team
      const user = await this.userRepository.findOneByIdForTenant(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const previousTeamId = (user as any).currentTeamId;

      // Update user's current team (we'll store this in a separate table or user metadata)
      await this.updateUserCurrentTeam(userId, switchDto.teamId, tenantId);

      // Update membership's last accessed time
      membership.lastAccessedAt = new Date();
      await manager.save(TeamMembership, membership);

      // Generate new JWT with updated team context
      const newToken = this.jwtService.generateAccessToken({
        sub: user.id,
        email: user.email,
        tenantId: tenantId,
        role: user.role,
      });

      // Log the team switch for audit
      await this.auditService.logEvent({
        eventType: AuditEventType.TEAM_SWITCHED,
        userId,
        tenantId,
        description: `User switched from team ${previousTeamId || 'none'} to team "${team.name}"`,
        metadata: {
          previousTeamId,
          newTeamId: switchDto.teamId,
          teamName: team.name,
          membershipId: membership.id,
        },
      });

      // Send notification to team members (optional)
      if (switchDto.notifyTeamMembers) {
        await this.notifyTeamMembersOfSwitch(team, user, tenantId);
      }

      return {
        success: true,
        message: `Successfully switched to team "${team.name}"`,
        team: {
          id: team.id,
          name: team.name,
          ...(team.description && { description: team.description }),
          status: team.status,
          ...(team.avatarUrl && { avatarUrl: team.avatarUrl }),
        },
        membership: {
          id: membership.id,
          roleId: membership.roleId,
          roleName: membership.role?.name || 'Unknown',
          status: membership.status,
          joinedAt: membership.joinedAt!,
          ...(membership.lastAccessedAt && { lastAccessedAt: membership.lastAccessedAt }),
        },
        accessToken: newToken,
      };
    });
  }

  /**
   * Verify user has access to a specific team
   */
  async verifyTeamAccess(
    userId: string,
    teamId: string,
    tenantId: string
  ): Promise<boolean> {
    const membership = await this.teamRepository.findTeamMember(
      teamId,
      userId,
      tenantId
    );

    return !!(membership && membership.status === TeamStatus.ACTIVE);
  }

  /**
   * Get user's available teams for switching
   */
  async getAvailableTeams(
    userId: string,
    tenantId: string
  ): Promise<Array<{ id: string; name: string; role: string }>> {
    const userTeams = await this.teamRepository.findUserTeamsWithMemberships(
      userId,
      tenantId
    );

    return userTeams.teams
      .filter(team => team.membership.status === TeamStatus.ACTIVE)
      .map(team => ({
        id: team.id,
        name: team.name,
        role: team.membership.role?.name || 'Unknown',
      }));
  }

  /**
   * Update user's current team in the database
   */
  private async updateUserCurrentTeam(
    userId: string,
    teamId: string,
    tenantId: string
  ): Promise<void> {
    // For now, we'll store this in user metadata
    // In a production system, you might want a separate table for user sessions/context
    await this.userRepository.update(
      { id: userId },
      {
        // Store current team in metadata
        metadata: { currentTeamId: teamId } as Record<string, any>,
      }
    );
  }

  /**
   * Notify team members when someone switches to their team
   */
  private async notifyTeamMembersOfSwitch(
    team: Team,
    user: User,
    tenantId: string
  ): Promise<void> {
    try {
      const teamMembers = await this.teamRepository.findTeamMembers(
        team.id,
        tenantId,
        {}
      );

      // Send notifications to team members (excluding the user who switched)
      const membersToNotify = teamMembers.members.filter(
        member => member.userId !== user.id
      );

      for (const member of membersToNotify) {
        if (member.user?.email) {
          await this.emailService.sendTeamSwitchNotification({
            to: member.user.email,
            teamName: team.name,
            userName: `${user.firstName} ${user.lastName}`,
            userEmail: user.email,
          });
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to send team switch notifications: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
