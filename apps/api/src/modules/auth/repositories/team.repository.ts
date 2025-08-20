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
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

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
    invitationId: string,
    tenantId: string
  ): Promise<TeamInvitation | null> {
    return this.invitationRepository.findOne({
      where: { id: invitationId, tenantId },
      relations: ['team', 'role', 'invitedBy'],
    });
  }

  async updateInvitationToken(
    invitationId: string,
    token: string,
    expiresAt: Date,
    tenantId: string
  ): Promise<TeamInvitation> {
    await this.invitationRepository.update(
      { id: invitationId, tenantId },
      { token, expiresAt }
    );

    const updatedInvitation = await this.invitationRepository.findOne({
      where: { id: invitationId, tenantId },
      relations: ['team', 'role', 'invitedBy'],
    });

    if (!updatedInvitation) {
      throw new Error('Invitation not found after update');
    }

    return updatedInvitation;
  }

  async findExpiredInvitations(tenantId: string): Promise<TeamInvitation[]> {
    return this.invitationRepository
      .createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.team', 'team')
      .leftJoinAndSelect('invitation.role', 'role')
      .leftJoinAndSelect('invitation.invitedBy', 'invitedBy')
      .where('invitation.tenantId = :tenantId', { tenantId })
      .andWhere('invitation.status = :status', { status: 'pending' })
      .andWhere('invitation.expiresAt < :now', { now: new Date() })
      .getMany();
  }

  async getInvitationAnalytics(
    teamId: string,
    tenantId: string,
    startDate: Date
  ): Promise<{
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    cancelled: number;
    averageResponseTime?: number;
    byRole: Record<string, number>;
    byDay: Record<string, number>;
  }> {
    // Get basic counts
    const [total, pending, accepted, expired, cancelled] = await Promise.all([
      this.invitationRepository.count({
        where: { teamId, tenantId, createdAt: { $gte: startDate } as any },
      }),
      this.invitationRepository.count({
        where: {
          teamId,
          tenantId,
          status: 'pending',
          createdAt: { $gte: startDate } as any,
        },
      }),
      this.invitationRepository.count({
        where: {
          teamId,
          tenantId,
          status: 'accepted',
          createdAt: { $gte: startDate } as any,
        },
      }),
      this.invitationRepository.count({
        where: {
          teamId,
          tenantId,
          status: 'expired',
          createdAt: { $gte: startDate } as any,
        },
      }),
      this.invitationRepository.count({
        where: {
          teamId,
          tenantId,
          status: 'cancelled',
          createdAt: { $gte: startDate } as any,
        },
      }),
    ]);

    // Get average response time for accepted invitations
    const acceptedInvitations = await this.invitationRepository
      .createQueryBuilder('invitation')
      .select('invitation.createdAt', 'createdAt')
      .addSelect('invitation.acceptedAt', 'acceptedAt')
      .where(
        'invitation.teamId = :teamId AND invitation.tenantId = :tenantId',
        { teamId, tenantId }
      )
      .andWhere('invitation.status = :status', { status: 'accepted' })
      .andWhere('invitation.createdAt >= :startDate', { startDate })
      .andWhere('invitation.acceptedAt IS NOT NULL')
      .getRawMany();

    let averageResponseTime: number | undefined;
    if (acceptedInvitations.length > 0) {
      const totalResponseTime = acceptedInvitations.reduce(
        (sum, invitation) => {
          const created = new Date(invitation.createdAt);
          const accepted = new Date(invitation.acceptedAt);
          return sum + (accepted.getTime() - created.getTime());
        },
        0
      );
      averageResponseTime =
        totalResponseTime / acceptedInvitations.length / (1000 * 60 * 60); // Convert to hours
    }

    // Get invitations by role
    const byRole = await this.invitationRepository
      .createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.role', 'role')
      .select('role.name', 'roleName')
      .addSelect('COUNT(*)', 'count')
      .where(
        'invitation.teamId = :teamId AND invitation.tenantId = :tenantId',
        { teamId, tenantId }
      )
      .andWhere('invitation.createdAt >= :startDate', { startDate })
      .groupBy('role.name')
      .getRawMany();

    const roleCounts = byRole.reduce(
      (acc, item) => {
        acc[item.roleName] = parseInt(item.count);
        return acc;
      },
      {} as Record<string, number>
    );

    // Get invitations by day
    const byDay = await this.invitationRepository
      .createQueryBuilder('invitation')
      .select('DATE(invitation.createdAt)', 'day')
      .addSelect('COUNT(*)', 'count')
      .where(
        'invitation.teamId = :teamId AND invitation.tenantId = :tenantId',
        { teamId, tenantId }
      )
      .andWhere('invitation.createdAt >= :startDate', { startDate })
      .groupBy('DATE(invitation.createdAt)')
      .orderBy('day', 'ASC')
      .getRawMany();

    const dayCounts = byDay.reduce(
      (acc, item) => {
        acc[item.day] = parseInt(item.count);
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total,
      pending,
      accepted,
      expired,
      cancelled,
      ...(averageResponseTime !== undefined && { averageResponseTime }),
      byRole: roleCounts,
      byDay: dayCounts,
    };
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

  generateInvitationToken(): string {
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
}
