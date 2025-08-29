import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';
import {
  Team,
  TeamMembership,
  TeamInvitation,
  TeamStatus,
} from '../entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../rbac/entities/role.entity';

@Injectable()
export class TeamRepository extends TenantScopedRepository<Team> {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMembership)
    private readonly membershipRepository: Repository<TeamMembership>,
    @InjectRepository(TeamInvitation)
    private readonly invitationRepository: Repository<TeamInvitation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>
  ) {
    super(
      teamRepository.target,
      teamRepository.manager,
      teamRepository.queryRunner
    );
  }

  protected getTenantIdField(): string {
    return 'tenantId';
  }

  /**
   * Find team by name within current tenant
   */
  async findByName(name: string, tenantId: string): Promise<Team | null> {
    return this.findOneWithTenantScope({
      where: { name },
    });
  }

  async findTeamsWithDetails(
    tenantId: string,
    query: any = {}
  ): Promise<{ teams: Team[]; total: number }> {
    const { search, status, managerId, page = 1, limit = 10 } = query;

    const queryBuilder = this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.manager', 'manager')
      .leftJoinAndSelect('team.memberships', 'memberships')
      .where('team.tenantId = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere(
        'team.name ILIKE :search OR team.description ILIKE :search',
        {
          search: `%${search}%`,
        }
      );
    }

    if (status) {
      queryBuilder.andWhere('team.status = :status', { status });
    }

    if (managerId) {
      queryBuilder.andWhere('team.managerId = :managerId', { managerId });
    }

    const total = await queryBuilder.getCount();

    const teams = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('team.createdAt', 'DESC')
      .getMany();

    // Add member count to each team
    const teamsWithMemberCount = await Promise.all(
      teams.map(async team => {
        const memberCount = await this.membershipRepository.count({
          where: { teamId: team.id, status: TeamStatus.ACTIVE },
        });
        return { ...team, memberCount } as Team & { memberCount: number };
      })
    );

    return { teams: teamsWithMemberCount, total };
  }

  async findTeamWithDetails(
    teamId: string,
    tenantId: string
  ): Promise<Team | null> {
    const team = await this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.manager', 'manager')
      .leftJoinAndSelect('team.memberships', 'memberships')
      .leftJoinAndSelect('memberships.user', 'user')
      .leftJoinAndSelect('memberships.role', 'role')
      .where('team.id = :teamId AND team.tenantId = :tenantId', {
        teamId,
        tenantId,
      })
      .getOne();

    if (team) {
      const memberCount = await this.membershipRepository.count({
        where: { teamId: team.id, status: TeamStatus.ACTIVE },
      });
      return { ...team, memberCount } as Team & { memberCount: number };
    }

    return team;
  }

  async findTeamMembers(
    teamId: string,
    tenantId: string,
    query: any = {}
  ): Promise<{ members: TeamMembership[]; total: number }> {
    const { status, roleId, page = 1, limit = 10 } = query;

    const queryBuilder = this.membershipRepository
      .createQueryBuilder('membership')
      .leftJoinAndSelect('membership.user', 'user')
      .leftJoinAndSelect('membership.role', 'role')
      .leftJoinAndSelect('membership.invitedBy', 'invitedBy')
      .where(
        'membership.teamId = :teamId AND membership.tenantId = :tenantId',
        { teamId, tenantId }
      );

    if (status) {
      queryBuilder.andWhere('membership.status = :status', { status });
    }

    if (roleId) {
      queryBuilder.andWhere('membership.roleId = :roleId', { roleId });
    }

    const total = await queryBuilder.getCount();

    const members = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('membership.createdAt', 'DESC')
      .getMany();

    return { members, total };
  }

  async findTeamMember(
    teamId: string,
    userId: string,
    tenantId: string
  ): Promise<TeamMembership | null> {
    return this.membershipRepository
      .createQueryBuilder('membership')
      .leftJoinAndSelect('membership.user', 'user')
      .leftJoinAndSelect('membership.role', 'role')
      .leftJoinAndSelect('membership.invitedBy', 'invitedBy')
      .where(
        'membership.teamId = :teamId AND membership.userId = :userId AND membership.tenantId = :tenantId',
        {
          teamId,
          userId,
          tenantId,
        }
      )
      .getOne();
  }

  async findUserTeams(userId: string, tenantId: string): Promise<Team[]> {
    return this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.memberships', 'membership')
      .leftJoinAndSelect('team.manager', 'manager')
      .where(
        'membership.userId = :userId AND team.tenantId = :tenantId AND membership.status = :status',
        {
          userId,
          tenantId,
          status: TeamStatus.ACTIVE,
        }
      )
      .getMany();
  }

  async findTeamInvitations(
    teamId: string,
    tenantId: string,
    query: any = {}
  ): Promise<{ invitations: TeamInvitation[]; total: number }> {
    const { status, page = 1, limit = 10 } = query;

    const queryBuilder = this.invitationRepository
      .createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.role', 'role')
      .leftJoinAndSelect('invitation.invitedBy', 'invitedBy')
      .where(
        'invitation.teamId = :teamId AND invitation.tenantId = :tenantId',
        { teamId, tenantId }
      );

    if (status) {
      queryBuilder.andWhere('invitation.status = :status', { status });
    }

    const total = await queryBuilder.getCount();

    const invitations = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('invitation.createdAt', 'DESC')
      .getMany();

    return { invitations, total };
  }

  async findInvitationByToken(
    token: string,
    tenantId: string
  ): Promise<TeamInvitation | null> {
    return this.invitationRepository
      .createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.team', 'team')
      .leftJoinAndSelect('invitation.role', 'role')
      .leftJoinAndSelect('invitation.invitedBy', 'invitedBy')
      .where('invitation.token = :token AND invitation.tenantId = :tenantId', {
        token,
        tenantId,
      })
      .getOne();
  }

  async findInvitationByEmail(
    email: string,
    teamId: string,
    tenantId: string
  ): Promise<TeamInvitation | null> {
    return this.invitationRepository.findOne({
      where: { email, teamId, tenantId },
      relations: ['role', 'invitedBy'],
    });
  }

  async findInvitationById(
    invitationId: string
  ): Promise<TeamInvitation | null> {
    return this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['role', 'invitedBy'],
    });
  }

  async createTeam(teamData: Partial<Team>, tenantId: string): Promise<Team> {
    const team = this.teamRepository.create({
      ...teamData,
      tenantId,
    });
    return this.saveWithTenantScope(team);
  }

  async updateTeam(
    teamId: string,
    updateData: Partial<Team>,
    tenantId: string
  ): Promise<Team> {
    await this.updateWithTenantScope({ id: teamId }, updateData);
    const team = await this.findOneByIdForTenant(teamId);
    if (!team) {
      throw new Error('Team not found after update');
    }
    return team;
  }

  async addTeamMember(
    membershipData: Partial<TeamMembership>,
    tenantId: string
  ): Promise<TeamMembership> {
    const membership = this.membershipRepository.create({
      ...membershipData,
      tenantId,
      joinedAt: new Date(),
    });
    return this.membershipRepository.save(membership);
  }

  async updateTeamMember(
    membershipId: string,
    updateData: Partial<TeamMembership>,
    tenantId: string
  ): Promise<TeamMembership | null> {
    await this.membershipRepository.update(
      { id: membershipId, tenantId },
      updateData
    );
    return this.membershipRepository.findOne({
      where: { id: membershipId, tenantId },
      relations: ['user', 'role', 'invitedBy'],
    });
  }

  async removeTeamMember(
    teamId: string,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    const result = await this.membershipRepository.delete({
      teamId,
      userId,
      tenantId,
    });
    return (result.affected ?? 0) > 0;
  }

  async createTeamInvitation(
    invitationData: Partial<TeamInvitation>,
    tenantId: string
  ): Promise<TeamInvitation> {
    const invitation = this.invitationRepository.create({
      ...invitationData,
      tenantId,
      token: this.generateInvitationToken(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    const savedInvitation = await this.invitationRepository.save(invitation);

    // Load the invitedBy relation to ensure it's available for the email service
    return this.invitationRepository.findOne({
      where: { id: savedInvitation.id, tenantId },
      relations: ['invitedBy', 'role'],
    }) as Promise<TeamInvitation>;
  }

  async updateInvitationStatus(
    invitationId: string,
    status: string,
    tenantId: string
  ): Promise<TeamInvitation | null> {
    const updateData: any = { status };
    if (status === 'accepted') {
      updateData.acceptedAt = new Date();
    }

    await this.invitationRepository.update(
      { id: invitationId, tenantId },
      updateData
    );
    return this.invitationRepository.findOne({
      where: { id: invitationId, tenantId },
      relations: ['role', 'invitedBy'],
    });
  }

  async getTeamAnalytics(teamId: string, tenantId: string): Promise<any> {
    const totalMembers = await this.membershipRepository.count({
      where: { teamId, tenantId },
    });

    const activeMembers = await this.membershipRepository.count({
      where: { teamId, tenantId, status: TeamStatus.ACTIVE },
    });

    const membersByRole = await this.membershipRepository
      .createQueryBuilder('membership')
      .leftJoinAndSelect('membership.role', 'role')
      .select('role.name', 'roleName')
      .addSelect('COUNT(*)', 'count')
      .where(
        'membership.teamId = :teamId AND membership.tenantId = :tenantId',
        { teamId, tenantId }
      )
      .groupBy('role.name')
      .getRawMany();

    const roleCounts = membersByRole.reduce((acc, item) => {
      acc[item.roleName] = parseInt(item.count);
      return acc;
    }, {});

    const team = await this.teamRepository.findOne({
      where: { id: teamId, tenantId },
      select: ['createdAt'],
    });

    return {
      teamId,
      totalMembers,
      activeMembers,
      membersByRole: roleCounts,
      recentActivityCount: 0, // TODO: Implement activity tracking
      createdAt: team?.createdAt,
    };
  }

  private generateInvitationToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  async checkUserTeamMembership(
    userId: string,
    teamId: string,
    tenantId: string
  ): Promise<boolean> {
    const count = await this.membershipRepository.count({
      where: { userId, teamId, tenantId, status: TeamStatus.ACTIVE },
    });
    return count > 0;
  }

  async getUserTeamRole(
    userId: string,
    teamId: string,
    tenantId: string
  ): Promise<Role | null> {
    const membership = await this.membershipRepository.findOne({
      where: { userId, teamId, tenantId, status: TeamStatus.ACTIVE },
      relations: ['role'],
    });
    return membership?.role || null;
  }

  async findUserTeamsWithMemberships(
    userId: string,
    tenantId: string
  ): Promise<{
    teams: Array<Team & { membership: TeamMembership; memberCount: number }>;
    total: number;
  }> {
    const queryBuilder = this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.memberships', 'membership')
      .leftJoinAndSelect('membership.role', 'role')
      .leftJoinAndSelect('team.manager', 'manager')
      .where('membership.userId = :userId AND team.tenantId = :tenantId', {
        userId,
        tenantId,
      });

    const teams = await queryBuilder.getMany();

    // Add member count and filter to only include the user's membership
    const teamsWithMembership = await Promise.all(
      teams.map(async team => {
        const memberCount = await this.membershipRepository.count({
          where: { teamId: team.id, status: TeamStatus.ACTIVE },
        });

        const userMembership = team.memberships?.find(m => m.userId === userId);

        return {
          ...team,
          membership: userMembership!,
          memberCount,
        } as Team & { membership: TeamMembership; memberCount: number };
      })
    );

    return {
      teams: teamsWithMembership,
      total: teamsWithMembership.length,
    };
  }

  async updateMembershipLastAccessed(
    membershipId: string,
    tenantId: string
  ): Promise<void> {
    await this.membershipRepository.update(
      { id: membershipId, tenantId },
      { lastAccessedAt: new Date() }
    );
  }
}
