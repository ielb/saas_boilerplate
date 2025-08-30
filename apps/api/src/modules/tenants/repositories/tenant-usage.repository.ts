import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TenantUsage,
  TenantUsageMetric,
} from '../entities/tenant-usage.entity';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';
import { requireTenantContext } from '../../../common/interceptors/tenant-scoping.interceptor';

@Injectable()
export class TenantUsageRepository extends TenantScopedRepository<TenantUsage> {
  constructor(
    @InjectRepository(TenantUsage)
    private readonly tenantUsageRepository: Repository<TenantUsage>
  ) {
    super(
      tenantUsageRepository.target,
      tenantUsageRepository.manager,
      tenantUsageRepository.queryRunner
    );
  }

  protected getTenantIdField(): string {
    return 'tenantId';
  }

  protected override shouldScopeByTenant(): boolean {
    return true;
  }

  /**
   * Find usage by metric within current tenant
   */
  async findByMetric(metric: TenantUsageMetric): Promise<TenantUsage[]> {
    return this.findWithTenantScope({
      where: { metric },
    });
  }

  /**
   * Find usage by date range within current tenant
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    metric?: TenantUsageMetric
  ): Promise<TenantUsage[]> {
    const queryBuilder = this.createTenantScopedQueryBuilder('usage');

    queryBuilder
      .where('usage.date >= :startDate', { startDate })
      .andWhere('usage.date <= :endDate', { endDate });

    if (metric) {
      queryBuilder.andWhere('usage.metric = :metric', { metric });
    }

    return queryBuilder.getMany();
  }

  /**
   * Get current usage for a metric within current tenant
   */
  async getCurrentUsage(
    metric: TenantUsageMetric
  ): Promise<TenantUsage | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.findOneWithTenantScope({
      where: { metric, date: today },
    });
  }

  /**
   * Increment usage for a metric within current tenant
   */
  async incrementUsage(
    metric: TenantUsageMetric,
    amount: number = 1
  ): Promise<TenantUsage> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let usage = await this.getCurrentUsage(metric);

    if (usage) {
      usage.value += amount;
      return this.saveWithTenantScope(usage);
    } else {
      usage = this.create({
        metric,
        value: amount,
        date: today,
      });
      return this.saveWithTenantScope(usage);
    }
  }

  /**
   * Set usage for a metric within current tenant
   */
  async setUsage(
    metric: TenantUsageMetric,
    value: number,
    date?: Date
  ): Promise<TenantUsage> {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    let usage = await this.findOneWithTenantScope({
      where: { metric, date: targetDate },
    });

    if (usage) {
      usage.value = value;
      return this.saveWithTenantScope(usage);
    } else {
      usage = this.create({
        metric,
        value,
        date: targetDate,
      });
      return this.saveWithTenantScope(usage);
    }
  }

  /**
   * Get usage summary within current tenant
   */
  async getUsageSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byMetric: Record<TenantUsageMetric, number>;
    byDate: Record<string, number>;
  }> {
    const queryBuilder = this.createTenantScopedQueryBuilder('usage');

    if (startDate) {
      queryBuilder.andWhere('usage.date >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('usage.date <= :endDate', { endDate });
    }

    const usages = await queryBuilder.getMany();

    const byMetric = {} as Record<TenantUsageMetric, number>;
    const byDate: Record<string, number> = {};
    let total = 0;

    for (const usage of usages) {
      // Aggregate by metric
      if (!byMetric[usage.metric]) {
        byMetric[usage.metric] = 0;
      }
      byMetric[usage.metric] += usage.value;

      // Aggregate by date
      const dateStr = usage.date.toISOString().split('T')[0];
      if (dateStr) {
        if (!byDate[dateStr]) {
          byDate[dateStr] = 0;
        }
        byDate[dateStr] += usage.value;
      }

      total += usage.value;
    }

    return { total, byMetric, byDate };
  }

  /**
   * Get usage statistics within current tenant
   */
  async getUsageStats(
    metric: TenantUsageMetric,
    days: number = 30
  ): Promise<{
    total: number;
    average: number;
    max: number;
    min: number;
    trend: number;
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usages = await this.findByDateRange(startDate, endDate, metric);

    if (usages.length === 0) {
      return {
        total: 0,
        average: 0,
        max: 0,
        min: 0,
        trend: 0,
      };
    }

    const values = usages.map(u => u.value);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    // Calculate trend (simple linear regression)
    const sortedUsages = usages.sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    const firstHalf = sortedUsages.slice(
      0,
      Math.floor(sortedUsages.length / 2)
    );
    const secondHalf = sortedUsages.slice(Math.floor(sortedUsages.length / 2));

    const firstHalfAvg =
      firstHalf.reduce((sum, u) => sum + u.value, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, u) => sum + u.value, 0) / secondHalf.length;

    const trend = secondHalfAvg - firstHalfAvg;

    return { total, average, max, min, trend };
  }

  /**
   * Clean up old usage data within current tenant
   */
  async cleanupOldUsage(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const tenantId = requireTenantContext();
    const result = await this.createQueryBuilder('usage')
      .delete()
      .where('usage.tenantId = :tenantId', { tenantId })
      .andWhere('usage.date < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
