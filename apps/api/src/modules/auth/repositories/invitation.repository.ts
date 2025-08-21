import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Invitation, InvitationStatus } from '../entities/invitation.entity';
import { InvitationQueryDto } from '../dto/invitation.dto';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';

@Injectable()
export class InvitationRepository extends TenantScopedRepository<Invitation> {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>
  ) {
    super(
      invitationRepository.target,
      invitationRepository.manager,
      invitationRepository.queryRunner
    );
  }

  protected getTenantIdField(): string {
    return 'tenantId';
  }

  async findByEmailAndTenant(
    email: string,
    tenantId: string
  ): Promise<Invitation | null> {
    return this.invitationRepository.findOne({
      where: { email, tenantId },
      relations: ['tenant', 'invitedBy', 'role', 'acceptedBy'],
    });
  }

  async findByIdAndTenant(
    id: string,
    tenantId: string
  ): Promise<Invitation | null> {
    return this.invitationRepository.findOne({
      where: { id, tenantId },
      relations: ['tenant', 'invitedBy', 'role', 'acceptedBy'],
    });
  }

  async findByToken(token: string): Promise<Invitation | null> {
    return this.invitationRepository.findOne({
      where: { token },
      relations: ['tenant', 'invitedBy', 'role', 'acceptedBy'],
    });
  }

  async findPendingByEmail(email: string): Promise<Invitation[]> {
    return this.invitationRepository.find({
      where: { email, status: InvitationStatus.PENDING },
      relations: ['tenant', 'invitedBy', 'role'],
    });
  }

  async findExpiredInvitations(): Promise<Invitation[]> {
    const now = new Date();
    return this.invitationRepository
      .createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.tenant', 'tenant')
      .leftJoinAndSelect('invitation.invitedBy', 'invitedBy')
      .leftJoinAndSelect('invitation.role', 'role')
      .where('invitation.status = :status', {
        status: InvitationStatus.PENDING,
      })
      .andWhere('invitation.expiresAt < :now', { now })
      .getMany();
  }

  async findWithFilters(
    query: InvitationQueryDto,
    tenantId: string
  ): Promise<{ invitations: Invitation[]; total: number }> {
    const queryBuilder = this.createFilteredQueryBuilder(query, tenantId);

    const total = await queryBuilder.getCount();

    const invitations = await queryBuilder
      .skip(((query.page || 1) - 1) * (query.limit || 10))
      .take(query.limit || 10)
      .orderBy('invitation.createdAt', 'DESC')
      .getMany();

    return { invitations, total };
  }

  async getStats(tenantId: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    revoked: number;
    acceptanceRate: number;
  }> {
    const stats = await this.invitationRepository
      .createQueryBuilder('invitation')
      .select('invitation.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('invitation.tenantId = :tenantId', { tenantId })
      .groupBy('invitation.status')
      .getRawMany();

    const total = stats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
    const accepted =
      stats.find(s => s.status === InvitationStatus.ACCEPTED)?.count || 0;
    const pending =
      stats.find(s => s.status === InvitationStatus.PENDING)?.count || 0;
    const expired =
      stats.find(s => s.status === InvitationStatus.EXPIRED)?.count || 0;
    const revoked =
      stats.find(s => s.status === InvitationStatus.REVOKED)?.count || 0;

    const acceptanceRate = total > 0 ? (parseInt(accepted) / total) * 100 : 0;

    return {
      total,
      pending: parseInt(pending),
      accepted: parseInt(accepted),
      expired: parseInt(expired),
      revoked: parseInt(revoked),
      acceptanceRate: Math.round(acceptanceRate * 100) / 100,
    };
  }

  async markExpiredInvitations(): Promise<number> {
    const now = new Date();
    const result = await this.invitationRepository
      .createQueryBuilder()
      .update(Invitation)
      .set({ status: InvitationStatus.EXPIRED })
      .where('status = :status', { status: InvitationStatus.PENDING })
      .andWhere('expiresAt < :now', { now })
      .execute();

    return result.affected || 0;
  }

  async deleteExpiredInvitations(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.invitationRepository
      .createQueryBuilder()
      .delete()
      .from(Invitation)
      .where('status IN (:...statuses)', {
        statuses: [InvitationStatus.EXPIRED, InvitationStatus.REVOKED],
      })
      .andWhere('updatedAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  private createFilteredQueryBuilder(
    query: InvitationQueryDto,
    tenantId: string
  ): SelectQueryBuilder<Invitation> {
    const queryBuilder = this.invitationRepository
      .createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.tenant', 'tenant')
      .leftJoinAndSelect('invitation.invitedBy', 'invitedBy')
      .leftJoinAndSelect('invitation.role', 'role')
      .leftJoinAndSelect('invitation.acceptedBy', 'acceptedBy')
      .where('invitation.tenantId = :tenantId', { tenantId });

    if (query.status) {
      queryBuilder.andWhere('invitation.status = :status', {
        status: query.status,
      });
    }

    if (query.type) {
      queryBuilder.andWhere('invitation.type = :type', { type: query.type });
    }

    if (query.email) {
      queryBuilder.andWhere('invitation.email ILIKE :email', {
        email: `%${query.email}%`,
      });
    }

    return queryBuilder;
  }

  async countPendingByTenant(tenantId: string): Promise<number> {
    return this.invitationRepository.count({
      where: { tenantId, status: InvitationStatus.PENDING },
    });
  }

  async findRecentInvitations(
    tenantId: string,
    limit: number = 10
  ): Promise<Invitation[]> {
    return this.invitationRepository.find({
      where: { tenantId },
      relations: ['invitedBy', 'role'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
