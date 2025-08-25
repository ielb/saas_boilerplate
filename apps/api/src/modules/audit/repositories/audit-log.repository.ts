import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditLog,
  AuditEventType,
  AuditEventSeverity,
} from '../entities/audit-log.entity';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';

@Injectable()
export class AuditLogRepository extends TenantScopedRepository<AuditLog> {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>
  ) {
    super(
      auditLogRepository.target,
      auditLogRepository.manager,
      auditLogRepository.queryRunner
    );
  }

  protected getTenantIdField(): string {
    return 'tenantId';
  }

  protected override shouldScopeByTenant(): boolean {
    return true;
  }

  /**
   * Find audit logs by event type within current tenant
   */
  async findByEventType(eventType: AuditEventType): Promise<AuditLog[]> {
    return this.findWithTenantScope({
      where: { eventType },
    });
  }

  /**
   * Find audit logs by event severity within current tenant
   */
  async findByEventSeverity(
    eventSeverity: AuditEventSeverity
  ): Promise<AuditLog[]> {
    return this.findWithTenantScope({
      where: { severity: eventSeverity },
    });
  }

  /**
   * Find audit logs by user ID within current tenant
   */
  async findByUserId(userId: string): Promise<AuditLog[]> {
    return this.findWithTenantScope({
      where: { userId },
    });
  }

  /**
   * Find audit logs by resource within current tenant
   */
  async findByResource(resource: string): Promise<AuditLog[]> {
    return this.findWithTenantScope({
      where: { resource },
    });
  }

  /**
   * Find audit logs with pagination within current tenant
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 50,
    eventType?: AuditEventType,
    eventLevel?: AuditEventSeverity,
    userId?: string,
    resource?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ auditLogs: AuditLog[]; total: number }> {
    const queryBuilder = this.createTenantScopedQueryBuilder('auditLog');

    if (eventType) {
      queryBuilder.andWhere('auditLog.eventType = :eventType', { eventType });
    }

    if (eventLevel) {
      queryBuilder.andWhere('auditLog.severity = :severity', {
        severity: eventLevel,
      });
    }

    if (userId) {
      queryBuilder.andWhere('auditLog.userId = :userId', { userId });
    }

    if (resource) {
      queryBuilder.andWhere('auditLog.resource = :resource', { resource });
    }

    if (startDate) {
      queryBuilder.andWhere('auditLog.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('auditLog.createdAt <= :endDate', { endDate });
    }

    // Apply safe pagination
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    const [auditLogs, total] = await queryBuilder
      .skip(offset)
      .take(safeLimit)
      .orderBy('auditLog.createdAt', 'DESC')
      .getManyAndCount();

    return { auditLogs, total };
  }

  /**
   * Find recent audit logs within current tenant
   */
  async findRecent(limit: number = 10): Promise<AuditLog[]> {
    return this.createTenantScopedQueryBuilder('auditLog')
      .orderBy('auditLog.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Find audit logs by date range within current tenant
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    return this.createTenantScopedQueryBuilder('auditLog')
      .where('auditLog.createdAt >= :startDate', { startDate })
      .andWhere('auditLog.createdAt <= :endDate', { endDate })
      .orderBy('auditLog.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Count audit logs by event type within current tenant
   */
  async countByEventType(eventType: AuditEventType): Promise<number> {
    return this.countWithTenantScope({
      where: { eventType },
    });
  }

  /**
   * Count audit logs by event level within current tenant
   */
  async countByEventLevel(eventLevel: AuditEventSeverity): Promise<number> {
    return this.countWithTenantScope({
      where: { severity: eventLevel },
    });
  }

  /**
   * Get audit log statistics within current tenant
   */
  async getAuditStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byEventType: Record<AuditEventType, number>;
    byEventLevel: Record<AuditEventSeverity, number>;
    byResource: Record<string, number>;
  }> {
    const queryBuilder = this.createTenantScopedQueryBuilder('auditLog');

    if (startDate) {
      queryBuilder.andWhere('auditLog.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('auditLog.createdAt <= :endDate', { endDate });
    }

    const total = await queryBuilder.getCount();

    // Get counts by event type
    const byEventType = {} as Record<AuditEventType, number>;
    for (const eventType of Object.values(AuditEventType)) {
      byEventType[eventType] = await this.countByEventType(eventType);
    }

    // Get counts by event level
    const byEventLevel = {} as Record<AuditEventSeverity, number>;
    for (const eventLevel of Object.values(AuditEventSeverity)) {
      byEventLevel[eventLevel] = await this.countByEventLevel(eventLevel);
    }

    // Get counts by resource
    const resourceCounts = await this.createTenantScopedQueryBuilder('auditLog')
      .select('auditLog.resource', 'resource')
      .addSelect('COUNT(*)', 'count')
      .groupBy('auditLog.resource')
      .getRawMany();

    const byResource = {} as Record<string, number>;
    resourceCounts.forEach(item => {
      byResource[item.resource] = parseInt(item.count);
    });

    return { total, byEventType, byEventLevel, byResource };
  }

  /**
   * Clean up old audit logs within current tenant
   */
  async cleanupOldLogs(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.createTenantScopedQueryBuilder('auditLog')
      .delete()
      .where('auditLog.createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
