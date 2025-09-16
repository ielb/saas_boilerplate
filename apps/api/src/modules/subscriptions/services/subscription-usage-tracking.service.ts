import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SubscriptionUsage } from '../entities/subscription-usage.entity';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { UsageMetricType } from '@app/shared';

export interface UsageRecord {
  subscriptionId: string;
  tenantId: string;
  metricType: UsageMetricType;
  metricName: string;
  quantity: number;
  unitPrice?: number;
  periodStart: Date;
  periodEnd: Date;
  metadata?: Record<string, any>;
  tags?: Record<string, string>;
  notes?: string;
}

export interface UsageLimit {
  metricName: string;
  limit: number;
  currentUsage: number;
  percentage: number;
  isExceeded: boolean;
  isNearLimit: boolean;
}

export interface UsageAnalytics {
  totalUsage: number;
  usageByMetric: Record<string, number>;
  usageTrends: Array<{
    period: string;
    usage: number;
  }>;
  topMetrics: Array<{
    metricName: string;
    usage: number;
    percentage: number;
  }>;
}

export interface UsageAlert {
  type: 'limit_exceeded' | 'near_limit' | 'usage_spike';
  metricName: string;
  currentUsage: number;
  limit: number;
  percentage: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class SubscriptionUsageTrackingService {
  private readonly logger = new Logger(SubscriptionUsageTrackingService.name);

  constructor(
    @InjectRepository(SubscriptionUsage)
    private readonly usageRepository: Repository<SubscriptionUsage>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>
  ) {}

  /**
   * Calculate period dates for a subscription based on start date and billing cycle
   */
  private calculatePeriodDates(subscription: Subscription): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const periodStart = new Date(subscription.startDate);
    const periodEnd = new Date(periodStart);

    switch (subscription.billingCycle) {
      case 'monthly':
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
      case 'quarterly':
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        break;
      case 'annually':
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        break;
      default:
        periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    return { periodStart, periodEnd };
  }

  /**
   * Record usage for a subscription
   */
  async recordUsage(usageRecord: UsageRecord): Promise<SubscriptionUsage> {
    try {
      // Validate subscription exists and is active
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: usageRecord.subscriptionId },
        relations: ['plan'],
      });

      if (!subscription) {
        throw new Error(`Subscription ${usageRecord.subscriptionId} not found`);
      }

      if (subscription.status !== 'active' && subscription.status !== 'trial') {
        throw new Error(
          `Cannot record usage for subscription in ${subscription.status} status`
        );
      }

      // Check if usage record already exists for this period
      const existingUsage = await this.usageRepository.findOne({
        where: {
          subscriptionId: usageRecord.subscriptionId,
          metricName: usageRecord.metricName,
          periodStart: usageRecord.periodStart,
          periodEnd: usageRecord.periodEnd,
        },
      });

      let usage: SubscriptionUsage;

      if (existingUsage) {
        // Update existing usage
        existingUsage.quantity = usageRecord.quantity;
        if (usageRecord.unitPrice !== undefined) {
          existingUsage.unitPrice = usageRecord.unitPrice;
        }
        existingUsage.totalAmount =
          usageRecord.quantity * (usageRecord.unitPrice || 0);
        if (usageRecord.metadata !== undefined) {
          existingUsage.metadata = usageRecord.metadata;
        }
        if (usageRecord.tags !== undefined) {
          existingUsage.tags = usageRecord.tags;
        }
        if (usageRecord.notes !== undefined) {
          existingUsage.notes = usageRecord.notes;
        }
        existingUsage.recordedAt = new Date();
        usage = await this.usageRepository.save(existingUsage);
      } else {
        // Create new usage record
        const newUsage = this.usageRepository.create({
          ...usageRecord,
          totalAmount: usageRecord.quantity * (usageRecord.unitPrice || 0),
          recordedAt: new Date(),
        });
        usage = await this.usageRepository.save(newUsage);
      }

      this.logger.log(
        `Recorded usage: ${usageRecord.metricName} = ${usageRecord.quantity} for subscription ${usageRecord.subscriptionId}`
      );

      // Check for usage limits and generate alerts
      await this.checkUsageLimits(usageRecord.subscriptionId);

      return usage;
    } catch (error: any) {
      this.logger.error(`Error recording usage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current usage for a subscription
   */
  async getCurrentUsage(
    subscriptionId: string
  ): Promise<Record<string, number>> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ['plan'],
      });

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      // Get current billing period - use fallback logic if not set
      let periodStart = subscription.currentPeriodStart;
      let periodEnd = subscription.currentPeriodEnd;

      // If period dates are not set, calculate them based on start date and billing cycle
      if (!periodStart || !periodEnd) {
        this.logger.warn(
          `Subscription ${subscriptionId} period dates not set, calculating from start date`
        );

        const calculatedDates = this.calculatePeriodDates(subscription);
        periodStart = calculatedDates.periodStart;
        periodEnd = calculatedDates.periodEnd;

        // Update the subscription with calculated period dates
        await this.subscriptionRepository.update(subscriptionId, {
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        });

        this.logger.log(
          `Updated subscription ${subscriptionId} with period dates: ${new Date(periodStart).toISOString()} - ${new Date(periodEnd).toISOString()}`
        );
      }

      const usageRecords = await this.usageRepository.find({
        where: {
          subscriptionId,
          periodStart,
          periodEnd,
        },
      });

      const usageMap: Record<string, number> = {};
      usageRecords.forEach(record => {
        usageMap[record.metricName] = record.quantity;
      });

      return usageMap;
    } catch (error: any) {
      this.logger.error(`Error getting current usage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get usage limits for a subscription
   */
  async getUsageLimits(subscriptionId: string): Promise<UsageLimit[]> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ['plan'],
      });

      if (!subscription || !subscription.plan) {
        throw new Error(`Subscription or plan not found for ${subscriptionId}`);
      }

      const currentUsage = await this.getCurrentUsage(subscriptionId);
      const limits = subscription.plan.limits || {};
      const usageLimits: UsageLimit[] = [];

      for (const [metricName, limit] of Object.entries(limits)) {
        const currentUsageValue = currentUsage[metricName] || 0;
        const percentage = limit > 0 ? (currentUsageValue / limit) * 100 : 0;
        const isExceeded = currentUsageValue > limit;
        const isNearLimit = percentage >= 80 && !isExceeded;

        usageLimits.push({
          metricName,
          limit,
          currentUsage: currentUsageValue,
          percentage,
          isExceeded,
          isNearLimit,
        });
      }

      return usageLimits;
    } catch (error: any) {
      this.logger.error(`Error getting usage limits: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check usage limits and generate alerts
   */
  async checkUsageLimits(subscriptionId: string): Promise<UsageAlert[]> {
    try {
      const usageLimits = await this.getUsageLimits(subscriptionId);
      const alerts: UsageAlert[] = [];

      for (const limit of usageLimits) {
        if (limit.isExceeded) {
          alerts.push({
            type: 'limit_exceeded',
            metricName: limit.metricName,
            currentUsage: limit.currentUsage,
            limit: limit.limit,
            percentage: limit.percentage,
            message: `Usage limit exceeded for ${limit.metricName}: ${limit.currentUsage}/${limit.limit}`,
            severity: 'critical',
          });
        } else if (limit.isNearLimit) {
          alerts.push({
            type: 'near_limit',
            metricName: limit.metricName,
            currentUsage: limit.currentUsage,
            limit: limit.limit,
            percentage: limit.percentage,
            message: `Approaching usage limit for ${limit.metricName}: ${limit.currentUsage}/${limit.limit} (${limit.percentage.toFixed(1)}%)`,
            severity: 'medium',
          });
        }
      }

      // Log alerts
      if (alerts.length > 0) {
        this.logger.warn(
          `Generated ${alerts.length} usage alerts for subscription ${subscriptionId}`
        );
        alerts.forEach(alert => {
          this.logger.warn(`Usage Alert: ${alert.message}`);
        });
      }

      return alerts;
    } catch (error: any) {
      this.logger.error(`Error checking usage limits: ${error.message}`);
      return [];
    }
  }

  /**
   * Get usage analytics for a subscription
   */
  async getUsageAnalytics(
    subscriptionId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UsageAnalytics> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      // Default to current billing period if dates not provided
      let periodStart = startDate || subscription.currentPeriodStart;
      let periodEnd = endDate || subscription.currentPeriodEnd;

      // If period dates are not set, calculate them based on start date and billing cycle
      if (!periodStart || !periodEnd) {
        this.logger.warn(
          `Subscription ${subscriptionId} period dates not set, calculating from start date`
        );

        const calculatedDates = this.calculatePeriodDates(subscription);
        periodStart = calculatedDates.periodStart;
        periodEnd = calculatedDates.periodEnd;

        // Update the subscription with calculated period dates if not provided as parameters
        if (!startDate && !endDate) {
          await this.subscriptionRepository.update(subscriptionId, {
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          });

          this.logger.log(
            `Updated subscription ${subscriptionId} with period dates: ${new Date(periodStart).toISOString()} - ${new Date(periodEnd).toISOString()}`
          );
        }
      }

      const usageRecords = await this.usageRepository.find({
        where: {
          subscriptionId,
          periodStart: Between(periodStart, periodEnd),
        },
        order: { recordedAt: 'ASC' },
      });

      // Calculate total usage
      const totalUsage = usageRecords.reduce(
        (sum, record) => sum + record.quantity,
        0
      );

      // Group usage by metric
      const usageByMetric: Record<string, number> = {};
      usageRecords.forEach(record => {
        usageByMetric[record.metricName] =
          (usageByMetric[record.metricName] || 0) + record.quantity;
      });

      // Calculate usage trends (daily aggregation)
      const usageTrends: Array<{ period: string; usage: number }> = [];
      const dailyUsage: Record<string, number> = {};

      usageRecords.forEach(record => {
        const date = new Date(record.recordedAt).toISOString().split('T')[0];
        if (date) {
          dailyUsage[date] = (dailyUsage[date] || 0) + record.quantity;
        }
      });

      Object.entries(dailyUsage).forEach(([date, usage]) => {
        usageTrends.push({ period: date, usage });
      });

      // Get top metrics
      const topMetrics = Object.entries(usageByMetric)
        .map(([metricName, usage]) => ({
          metricName,
          usage,
          percentage: totalUsage > 0 ? (usage / totalUsage) * 100 : 0,
        }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);

      return {
        totalUsage,
        usageByMetric,
        usageTrends,
        topMetrics,
      };
    } catch (error: any) {
      this.logger.error(`Error getting usage analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get usage history for a subscription
   */
  async getUsageHistory(
    subscriptionId: string,
    metricName?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<SubscriptionUsage[]> {
    try {
      const whereConditions: any = { subscriptionId };

      if (metricName) {
        whereConditions.metricName = metricName;
      }

      if (startDate && endDate) {
        whereConditions.periodStart = Between(startDate, endDate);
      }

      const usageHistory = await this.usageRepository.find({
        where: whereConditions,
        order: { recordedAt: 'DESC' },
        take: limit,
        relations: ['invoice'],
      });

      return usageHistory;
    } catch (error: any) {
      this.logger.error(`Error getting usage history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk record usage for multiple metrics
   */
  async bulkRecordUsage(
    usageRecords: UsageRecord[]
  ): Promise<SubscriptionUsage[]> {
    try {
      const results: SubscriptionUsage[] = [];

      for (const record of usageRecords) {
        const usage = await this.recordUsage(record);
        results.push(usage);
      }

      this.logger.log(`Bulk recorded ${results.length} usage records`);
      return results;
    } catch (error: any) {
      this.logger.error(`Error bulk recording usage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get usage summary for a tenant across all subscriptions
   */
  async getTenantUsageSummary(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalUsage: number;
    usageByMetric: Record<string, number>;
    topSubscriptions: Array<{
      subscriptionId: string;
      totalUsage: number;
    }>;
  }> {
    try {
      const subscriptions = await this.subscriptionRepository.find({
        where: { tenantId },
        relations: ['plan'],
      });

      const activeSubscriptions = subscriptions.filter(
        sub => sub.status === 'active' || sub.status === 'trial'
      );

      const periodStart =
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const periodEnd = endDate || new Date();

      const usageRecords = await this.usageRepository.find({
        where: {
          tenantId,
          periodStart: Between(periodStart, periodEnd),
        },
      });

      const totalUsage = usageRecords.reduce(
        (sum, record) => sum + record.quantity,
        0
      );

      const usageByMetric: Record<string, number> = {};
      usageRecords.forEach(record => {
        usageByMetric[record.metricName] =
          (usageByMetric[record.metricName] || 0) + record.quantity;
      });

      const subscriptionUsage: Record<string, number> = {};
      usageRecords.forEach(record => {
        subscriptionUsage[record.subscriptionId] =
          (subscriptionUsage[record.subscriptionId] || 0) + record.quantity;
      });

      const topSubscriptions = Object.entries(subscriptionUsage)
        .map(([subscriptionId, totalUsage]) => ({ subscriptionId, totalUsage }))
        .sort((a, b) => b.totalUsage - a.totalUsage)
        .slice(0, 10);

      return {
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        totalUsage,
        usageByMetric,
        topSubscriptions,
      };
    } catch (error: any) {
      this.logger.error(`Error getting tenant usage summary: ${error.message}`);
      throw error;
    }
  }
}
