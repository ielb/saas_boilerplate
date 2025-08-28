import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TeamRepository } from '../repositories/team.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { RoleRepository } from '../../rbac/repositories/role.repository';
import { EmailService } from '../../email/services/email.service';
import { AuditService } from '../../audit/services/audit.service';
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
} from '../dto/team.dto';
import {
  Team,
  TeamMembership,
  TeamInvitation,
  TeamStatus,
} from '../entities/team.entity';
import { Role } from '../../rbac/entities/role.entity';
import { AuditEventType } from '../../audit/entities/audit-log.entity';

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
    // Check if team name already exists in the tenant
    const existingTeam = await this.teamRepository.findByName(
      createTeamDto.name,
      tenantId
    );
    if (existingTeam) {
      throw new BadRequestException(
        `Team with name '${createTeamDto.name}' already exists in this tenant`
      );
    }

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
    const invitation =
      await this.teamRepository.findInvitationById(invitationId);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== ('pending' as any)) {
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
        teamId: (invitation as any).teamId,
        invitedEmail: (invitation as any).email,
        invitationId,
      },
    });
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
