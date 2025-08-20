import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TeamRepository } from '../repositories/team.repository';
import { UserRepository } from '../repositories/user.repository';
import { RoleRepository } from '../repositories/role.repository';
import { EmailService } from './email.service';
import { AuditService } from './audit.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  TeamQueryDto,
  TeamResponseDto,
  AddTeamMemberDto,
  UpdateTeamMemberDto,
  TeamMemberResponseDto,
  InviteTeamMemberDto,
  TeamInvitationResponseDto,
  AcceptTeamInvitationDto,
  TeamAnalyticsDto,
  BulkInviteTeamMembersDto,
  BulkInviteTeamMembersResponseDto,
  InvitationAnalyticsDto,
} from '../dto/team.dto';
import {
  Team,
  TeamMembership,
  TeamInvitation,
  TeamStatus,
} from '../entities/team.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { AuditEventType } from '../entities/audit-log.entity';

@Injectable()
export class TeamService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService
  ) {}

  async createTeam(
    createTeamDto: CreateTeamDto,
    tenantId: string,
    userId: string
  ): Promise<TeamResponseDto> {
    // Validate manager exists if provided
    if (createTeamDto.managerId) {
      const manager = await this.userRepository.findOneByIdForTenant(
        createTeamDto.managerId
      );
      if (!manager) {
        throw new NotFoundException('Manager not found');
      }
    }

    const team = await this.teamRepository.createTeam(createTeamDto, tenantId);

    // Add creator as team member with Manager role
    const managerRole = await this.roleRepository.findByName('Manager');
    if (managerRole) {
      await this.teamRepository.addTeamMember(
        {
          teamId: team.id,
          userId: userId,
          roleId: managerRole.id,
          invitedById: userId,
        },
        tenantId
      );
    }

    // Audit log
    await this.auditService.logEvent({
      eventType: AuditEventType.TEAM_CREATED,
      userId,
      tenantId,
      description: `Team "${team.name}" created`,
      metadata: { teamName: team.name, teamId: team.id },
    });

    return this.mapTeamToResponseDto(team);
  }

  async findTeams(
    query: TeamQueryDto,
    tenantId: string
  ): Promise<{ teams: TeamResponseDto[]; total: number }> {
    const { teams, total } = await this.teamRepository.findTeamsWithDetails(
      tenantId,
      query
    );

    const teamDtos = await Promise.all(
      teams.map(team => this.mapTeamToResponseDto(team))
    );

    return { teams: teamDtos, total };
  }

  async findTeam(teamId: string, tenantId: string): Promise<TeamResponseDto> {
    const team = await this.teamRepository.findTeamWithDetails(
      teamId,
      tenantId
    );
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.mapTeamToResponseDto(team);
  }

  async updateTeam(
    teamId: string,
    updateTeamDto: UpdateTeamDto,
    tenantId: string,
    userId: string
  ): Promise<TeamResponseDto> {
    const team = await this.teamRepository.findOneByIdForTenant(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Validate manager exists if provided
    if (updateTeamDto.managerId) {
      const manager = await this.userRepository.findOneByIdForTenant(
        updateTeamDto.managerId
      );
      if (!manager) {
        throw new NotFoundException('Manager not found');
      }
    }

    const updatedTeam = await this.teamRepository.updateTeam(
      teamId,
      updateTeamDto,
      tenantId
    );

    // Audit log
    await this.auditService.logEvent({
      eventType: AuditEventType.TEAM_UPDATED,
      userId,
      tenantId,
      description: `Team "${updatedTeam.name}" updated`,
      metadata: { teamName: updatedTeam.name, teamId, changes: updateTeamDto },
    });

    return this.mapTeamToResponseDto(updatedTeam);
  }

  async deleteTeam(
    teamId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const team = await this.teamRepository.findOneByIdForTenant(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    await this.teamRepository.deleteWithTenantScope({ id: teamId });

    // Audit log
    await this.auditService.logEvent({
      eventType: AuditEventType.TEAM_DELETED,
      userId,
      tenantId,
      description: `Team "${team.name}" deleted`,
      metadata: { teamName: team.name, teamId },
    });
  }

  async addTeamMember(
    teamId: string,
    addMemberDto: AddTeamMemberDto,
    tenantId: string,
    userId: string
  ): Promise<TeamMemberResponseDto> {
    // Validate team exists
    const team = await this.teamRepository.findOneByIdForTenant(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    // Validate user exists
    const user = await this.userRepository.findOneByIdForTenant(
      addMemberDto.userId
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate role exists
    const role = await this.roleRepository.findOneByIdForTenant(
      addMemberDto.roleId
    );
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if user is already a member
    const existingMembership = await this.teamRepository.findTeamMember(
      teamId,
      addMemberDto.userId,
      tenantId
    );
    if (existingMembership) {
      throw new BadRequestException('User is already a member of this team');
    }

    const membership = await this.teamRepository.addTeamMember(
      {
        teamId,
        userId: addMemberDto.userId,
        roleId: addMemberDto.roleId,
        invitedById: userId,
      },
      tenantId
    );

    // Audit log
    await this.auditService.logEvent({
      eventType: AuditEventType.TEAM_MEMBER_ADDED,
      userId,
      tenantId,
      description: `User "${user.email}" added to team "${team.name}"`,
      metadata: {
        teamId,
        teamName: team.name,
        memberId: addMemberDto.userId,
        memberEmail: user.email,
        roleId: addMemberDto.roleId,
        roleName: role.name,
        membershipId: membership.id,
      },
    });

    return this.mapMembershipToResponseDto(membership);
  }

  async findTeamMembers(
    teamId: string,
    query: any,
    tenantId: string
  ): Promise<{ members: TeamMemberResponseDto[]; total: number }> {
    const { members, total } = await this.teamRepository.findTeamMembers(
      teamId,
      tenantId,
      query
    );

    const memberDtos = members.map(membership =>
      this.mapMembershipToResponseDto(membership)
    );

    return { members: memberDtos, total };
  }

  async updateTeamMember(
    teamId: string,
    memberId: string,
    updateMemberDto: UpdateTeamMemberDto,
    tenantId: string,
    userId: string
  ): Promise<TeamMemberResponseDto> {
    // Validate team exists
    const team = await this.teamRepository.findOneByIdForTenant(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Validate role exists
    const role = await this.roleRepository.findOneByIdForTenant(
      updateMemberDto.roleId
    );
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const membership = await this.teamRepository.updateTeamMember(
      memberId,
      updateMemberDto,
      tenantId
    );
    if (!membership) {
      throw new NotFoundException('Team member not found');
    }

    // Audit log
    await this.auditService.logEvent({
      eventType: AuditEventType.TEAM_MEMBER_UPDATED,
      userId,
      tenantId,
      description: `Team member updated in team "${team.name}"`,
      metadata: {
        teamId,
        teamName: team.name,
        memberId: membership.userId,
        membershipId: memberId,
        changes: updateMemberDto,
      },
    });

    return this.mapMembershipToResponseDto(membership);
  }

  async removeTeamMember(
    teamId: string,
    userIdToRemove: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    // Validate team exists
    const team = await this.teamRepository.findOneByIdForTenant(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Get member details for audit log
    const membership = await this.teamRepository.findTeamMember(
      teamId,
      userIdToRemove,
      tenantId
    );
    if (!membership) {
      throw new NotFoundException('Team member not found');
    }

    const success = await this.teamRepository.removeTeamMember(
      teamId,
      userIdToRemove,
      tenantId
    );
    if (!success) {
      throw new NotFoundException('Failed to remove team member');
    }

    // Audit log
    await this.auditService.logEvent({
      eventType: AuditEventType.TEAM_MEMBER_REMOVED,
      userId,
      tenantId,
      description: `User removed from team "${team.name}"`,
      metadata: {
        teamId,
        teamName: team.name,
        memberId: userIdToRemove,
        memberEmail: membership.user?.email,
        membershipId: membership.id,
      },
    });
  }

  async inviteTeamMember(
    teamId: string,
    inviteDto: InviteTeamMemberDto,
    tenantId: string,
    userId: string
  ): Promise<TeamInvitationResponseDto> {
    // Validate team exists
    const team = await this.teamRepository.findOneByIdForTenant(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Validate role exists
    const role = await this.roleRepository.findOneByIdForTenant(
      inviteDto.roleId
    );
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(inviteDto.email);
    if (existingUser) {
      // Check if user is already a member
      const existingMembership = await this.teamRepository.findTeamMember(
        teamId,
        existingUser.id,
        tenantId
      );
      if (existingMembership) {
        throw new BadRequestException('User is already a member of this team');
      }
    }

    // Check for existing invitation
    const existingInvitation = await this.teamRepository.findInvitationByEmail(
      inviteDto.email,
      teamId,
      tenantId
    );
    if (existingInvitation && existingInvitation.status === 'pending') {
      throw new BadRequestException(
        'An invitation has already been sent to this email'
      );
    }
    const invitation = await this.teamRepository.createTeamInvitation(
      {
        teamId,
        email: inviteDto.email,
        roleId: inviteDto.roleId,
        invitedById: userId,
      },
      tenantId
    );

    // Send invitation email
    await this.emailService.sendTeamInvitation({
      to: inviteDto.email,
      teamName: team.name,
      inviterName: `${invitation.invitedBy?.firstName} ${invitation.invitedBy?.lastName}`,
      roleName: role.name,
      invitationToken: invitation.token,
      ...(inviteDto.message && { message: inviteDto.message }),
    });

    // Audit log
    await this.auditService.logEvent({
      eventType: AuditEventType.TEAM_INVITATION_SENT,
      userId,
      tenantId,
      description: `Invitation sent to "${inviteDto.email}" for team "${team.name}"`,
      metadata: {
        teamId,
        teamName: team.name,
        invitedEmail: inviteDto.email,
        roleId: inviteDto.roleId,
        roleName: role.name,
        invitationId: invitation.id,
      },
    });

    return this.mapInvitationToResponseDto(invitation);
  }

  async findTeamInvitations(
    teamId: string,
    query: any,
    tenantId: string
  ): Promise<{ invitations: TeamInvitationResponseDto[]; total: number }> {
    const { invitations, total } =
      await this.teamRepository.findTeamInvitations(teamId, tenantId, query);

    const invitationDtos = invitations.map(invitation =>
      this.mapInvitationToResponseDto(invitation)
    );

    return { invitations: invitationDtos, total };
  }

  async acceptTeamInvitation(
    token: string,
    tenantId: string,
    userId: string
  ): Promise<TeamMemberResponseDto> {
    const invitation = await this.teamRepository.findInvitationByToken(
      token,
      tenantId
    );
    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.status !== ('pending' as any)) {
      throw new BadRequestException('Invitation is no longer valid');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // Get user details
    const user = await this.userRepository.findOneByIdForTenant(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already a member
    const existingMembership = await this.teamRepository.findTeamMember(
      invitation.teamId,
      userId,
      tenantId
    );
    if (existingMembership) {
      throw new BadRequestException('User is already a member of this team');
    }

    // Add user to team
    const membership = await this.teamRepository.addTeamMember(
      {
        teamId: invitation.teamId,
        userId,
        roleId: invitation.roleId,
        invitedById: invitation.invitedById,
      },
      tenantId
    );

    // Update invitation status
    await this.teamRepository.updateInvitationStatus(
      invitation.id,
      'accepted',
      tenantId
    );

    // Audit log
    await this.auditService.logEvent({
      eventType: AuditEventType.TEAM_INVITATION_ACCEPTED,
      userId,
      tenantId,
      description: `Team invitation accepted`,
      metadata: {
        teamId: (invitation as any).teamId,
        teamName: (invitation as any).team?.name,
        invitedEmail: (invitation as any).email,
        invitationId: invitation.id,
      },
    });

    return this.mapMembershipToResponseDto(membership);
  }

  async cancelTeamInvitation(
    invitationId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const invitation = await this.teamRepository.findInvitationById(
      invitationId,
      tenantId
    );
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation cannot be cancelled');
    }

    await this.teamRepository.updateInvitationStatus(
      invitationId,
      'cancelled',
      tenantId
    );

    // Audit log
    await this.auditService.logEvent({
      eventType: AuditEventType.TEAM_INVITATION_CANCELLED,
      userId,
      tenantId,
      description: `Team invitation cancelled`,
      metadata: {
        teamId: invitation.teamId,
        teamName: invitation.team?.name,
        invitedEmail: invitation.email,
        invitationId: invitation.id,
      },
    });
  }

  /**
   * Resend team invitation
   */
  async resendTeamInvitation(
    invitationId: string,
    tenantId: string,
    userId: string
  ): Promise<TeamInvitationResponseDto> {
    const invitation = await this.teamRepository.findInvitationById(
      invitationId,
      tenantId
    );
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Only pending invitations can be resent');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // Generate new token and extend expiration
    const newToken = this.teamRepository.generateInvitationToken();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const updatedInvitation = await this.teamRepository.updateInvitationToken(
      invitationId,
      newToken,
      newExpiresAt,
      tenantId
    );

    // Send new invitation email
    await this.emailService.sendTeamInvitation({
      to: invitation.email,
      teamName: invitation.team?.name || 'Team',
      inviterName: `${invitation.invitedBy?.firstName} ${invitation.invitedBy?.lastName}`,
      roleName: invitation.role?.name || 'Member',
      invitationToken: newToken,
      message: 'Your invitation has been resent',
    });

    // Audit log
    await this.auditService.logEvent({
      eventType: AuditEventType.TEAM_INVITATION_RESENT,
      userId,
      tenantId,
      description: `Team invitation resent`,
      metadata: {
        teamId: invitation.teamId,
        teamName: invitation.team?.name,
        invitedEmail: invitation.email,
        invitationId: invitation.id,
      },
    });

    return this.mapInvitationToResponseDto(updatedInvitation);
  }

  /**
   * Bulk invite team members
   */
  async bulkInviteTeamMembers(
    teamId: string,
    bulkInviteDto: BulkInviteTeamMembersDto,
    tenantId: string,
    userId: string
  ): Promise<BulkInviteTeamMembersResponseDto> {
    // Validate team exists
    const team = await this.teamRepository.findOneByIdForTenant(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const results: Array<{
      email: string;
      success: boolean;
      invitationId?: string;
      error?: string;
    }> = [];

    for (const inviteData of bulkInviteDto.invitations) {
      try {
        // Validate role exists
        const role = await this.roleRepository.findOneByIdForTenant(
          inviteData.roleId
        );
        if (!role) {
          results.push({
            email: inviteData.email,
            success: false,
            error: 'Role not found',
          });
          continue;
        }

        // Check if user already exists and is a member
        const existingUser = await this.userRepository.findByEmail(
          inviteData.email
        );
        if (existingUser) {
          const existingMembership = await this.teamRepository.findTeamMember(
            teamId,
            existingUser.id,
            tenantId
          );
          if (existingMembership) {
            results.push({
              email: inviteData.email,
              success: false,
              error: 'User is already a member of this team',
            });
            continue;
          }
        }

        // Check for existing invitation
        const existingInvitation =
          await this.teamRepository.findInvitationByEmail(
            inviteData.email,
            teamId,
            tenantId
          );
        if (existingInvitation && existingInvitation.status === 'pending') {
          results.push({
            email: inviteData.email,
            success: false,
            error: 'An invitation has already been sent to this email',
          });
          continue;
        }

        // Create invitation
        const invitation = await this.teamRepository.createTeamInvitation(
          {
            teamId,
            email: inviteData.email,
            roleId: inviteData.roleId,
            invitedById: userId,
          },
          tenantId
        );

        // Send invitation email
        await this.emailService.sendTeamInvitation({
          to: inviteData.email,
          teamName: team.name,
          inviterName: `${invitation.invitedBy?.firstName} ${invitation.invitedBy?.lastName}`,
          roleName: role.name,
          invitationToken: invitation.token,
          ...(inviteData.message && { message: inviteData.message }),
        });

        // Audit log
        await this.auditService.logEvent({
          eventType: AuditEventType.TEAM_INVITATION_SENT,
          userId,
          tenantId,
          description: `Team invitation sent via bulk operation`,
          metadata: {
            teamId,
            teamName: team.name,
            invitedEmail: inviteData.email,
            invitationId: invitation.id,
            bulkOperation: true,
          },
        });

        results.push({
          email: inviteData.email,
          success: true,
          invitationId: invitation.id,
        });
      } catch (error: any) {
        results.push({
          email: inviteData.email,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }

    return {
      totalInvitations: bulkInviteDto.invitations.length,
      successfulInvitations: results.filter(r => r.success).length,
      failedInvitations: results.filter(r => !r.success).length,
      results,
    };
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(tenantId: string): Promise<number> {
    const expiredInvitations =
      await this.teamRepository.findExpiredInvitations(tenantId);

    for (const invitation of expiredInvitations) {
      await this.teamRepository.updateInvitationStatus(
        invitation.id,
        'expired',
        tenantId
      );

      // Audit log
      await this.auditService.logEvent({
        eventType: AuditEventType.TEAM_INVITATION_EXPIRED,
        userId: invitation.invitedById,
        tenantId,
        description: `Team invitation expired automatically`,
        metadata: {
          teamId: invitation.teamId,
          teamName: invitation.team?.name,
          invitedEmail: invitation.email,
          invitationId: invitation.id,
          autoExpired: true,
        },
      });
    }

    return expiredInvitations.length;
  }

  /**
   * Get invitation analytics
   */
  async getInvitationAnalytics(
    teamId: string,
    tenantId: string,
    days: number = 30
  ): Promise<InvitationAnalyticsDto> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await this.teamRepository.getInvitationAnalytics(
      teamId,
      tenantId,
      startDate
    );

    const result: InvitationAnalyticsDto = {
      teamId,
      period: `${days} days`,
      totalInvitations: analytics.total,
      pendingInvitations: analytics.pending,
      acceptedInvitations: analytics.accepted,
      expiredInvitations: analytics.expired,
      cancelledInvitations: analytics.cancelled,
      acceptanceRate:
        analytics.total > 0 ? (analytics.accepted / analytics.total) * 100 : 0,
      invitationsByRole: analytics.byRole,
      invitationsByDay: analytics.byDay,
    };

    if (analytics.averageResponseTime !== undefined) {
      result.averageResponseTime = analytics.averageResponseTime;
    }

    return result;
  }

  async findUserTeams(
    userId: string,
    tenantId: string
  ): Promise<TeamResponseDto[]> {
    const teams = await this.teamRepository.findUserTeams(userId, tenantId);
    return Promise.all(teams.map(team => this.mapTeamToResponseDto(team)));
  }

  async getTeamAnalytics(
    teamId: string,
    tenantId: string
  ): Promise<TeamAnalyticsDto> {
    const team = await this.teamRepository.findOneByIdForTenant(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.teamRepository.getTeamAnalytics(teamId, tenantId);
  }

  async checkUserTeamMembership(
    userId: string,
    teamId: string,
    tenantId: string
  ): Promise<boolean> {
    return this.teamRepository.checkUserTeamMembership(
      userId,
      teamId,
      tenantId
    );
  }

  async getUserTeamRole(
    userId: string,
    teamId: string,
    tenantId: string
  ): Promise<Role | null> {
    return this.teamRepository.getUserTeamRole(userId, teamId, tenantId);
  }

  private async mapTeamToResponseDto(team: Team): Promise<TeamResponseDto> {
    return {
      id: team.id,
      name: team.name,
      ...(team.description && { description: team.description }),
      ...(team.managerId && { managerId: team.managerId }),
      status: team.status,
      ...(team.settings && { settings: team.settings }),
      ...(team.avatarUrl && { avatarUrl: team.avatarUrl }),
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      manager: team.manager
        ? {
            id: team.manager.id,
            firstName: team.manager.firstName,
            lastName: team.manager.lastName,
            email: team.manager.email,
          }
        : undefined,
      memberCount: (team as any).memberCount || 0,
    };
  }

  private mapMembershipToResponseDto(
    membership: TeamMembership
  ): TeamMemberResponseDto {
    return {
      id: membership.id,
      teamId: membership.teamId,
      userId: membership.userId,
      roleId: membership.roleId,
      status: membership.status,
      ...(membership.joinedAt && { joinedAt: membership.joinedAt }),
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      user: membership.user
        ? {
            id: membership.user.id,
            firstName: membership.user.firstName,
            lastName: membership.user.lastName,
            email: membership.user.email,
            ...(membership.user.avatar && {
              avatarUrl: membership.user.avatar,
            }),
          }
        : undefined,
      role: membership.role
        ? {
            id: membership.role.id,
            name: membership.role.name,
            ...(membership.role.description && {
              description: membership.role.description,
            }),
          }
        : undefined,
    };
  }

  private mapInvitationToResponseDto(
    invitation: TeamInvitation
  ): TeamInvitationResponseDto {
    return {
      id: invitation.id,
      teamId: invitation.teamId,
      email: invitation.email,
      roleId: invitation.roleId,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      ...(invitation.acceptedAt && { acceptedAt: invitation.acceptedAt }),
      createdAt: invitation.createdAt,
      role: invitation.role
        ? {
            id: invitation.role.id,
            name: invitation.role.name,
            ...(invitation.role.description && {
              description: invitation.role.description,
            }),
          }
        : undefined,
      invitedBy: invitation.invitedBy
        ? {
            id: invitation.invitedBy.id,
            firstName: invitation.invitedBy.firstName,
            lastName: invitation.invitedBy.lastName,
            email: invitation.invitedBy.email,
          }
        : undefined,
    };
  }
}
