import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionUsageTrackingService } from '../services/subscription-usage-tracking.service';
import {
  RecordUsageDto,
  BulkRecordUsageDto,
  GetUsageAnalyticsDto,
  GetUsageHistoryDto,
  GetTenantUsageSummaryDto,
  UsageLimitResponseDto,
  UsageAnalyticsResponseDto,
  UsageAlertResponseDto,
  TenantUsageSummaryResponseDto,
} from '../dto/usage-tracking.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { User } from '../../users/entities/user.entity';

@Controller('subscriptions/usage')
@UseGuards(JwtAuthGuard, TenantGuard)
export class UsageTrackingController {
  constructor(
    private readonly usageTrackingService: SubscriptionUsageTrackingService
  ) {}

  /**
   * Record usage for a subscription
   */
  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  async recordUsage(
    @Body() recordUsageDto: RecordUsageDto,
    @Request() req: any
  ): Promise<{
    success: boolean;
    usage: any;
    alerts: UsageAlertResponseDto[];
  }> {
    const user = req.user as User;

    // Ensure the subscription belongs to the user's tenant
    recordUsageDto.tenantId = user.tenantId;

    // Convert string dates to Date objects
    const usageRecord = {
      ...recordUsageDto,
      periodStart: new Date(recordUsageDto.periodStart),
      periodEnd: new Date(recordUsageDto.periodEnd),
    };

    const usage = await this.usageTrackingService.recordUsage(usageRecord);
    const alerts = await this.usageTrackingService.checkUsageLimits(
      recordUsageDto.subscriptionId
    );

    return {
      success: true,
      usage,
      alerts,
    };
  }

  /**
   * Bulk record usage for multiple metrics
   */
  @Post('bulk-record')
  @HttpCode(HttpStatus.CREATED)
  async bulkRecordUsage(
    @Body() bulkRecordUsageDto: BulkRecordUsageDto,
    @Request() req: any
  ): Promise<{
    success: boolean;
    usageRecords: any[];
    alerts: UsageAlertResponseDto[];
  }> {
    const user = req.user as User;

    // Ensure all usage records belong to the user's tenant and convert dates
    const usageRecords = bulkRecordUsageDto.usageRecords.map(record => ({
      ...record,
      tenantId: user.tenantId,
      periodStart: new Date(record.periodStart),
      periodEnd: new Date(record.periodEnd),
    }));

    const result =
      await this.usageTrackingService.bulkRecordUsage(usageRecords);

    // Check alerts for all affected subscriptions
    const subscriptionIds = [
      ...new Set(bulkRecordUsageDto.usageRecords.map(r => r.subscriptionId)),
    ];
    const allAlerts: UsageAlertResponseDto[] = [];

    for (const subscriptionId of subscriptionIds) {
      const alerts =
        await this.usageTrackingService.checkUsageLimits(subscriptionId);
      allAlerts.push(...alerts);
    }

    return {
      success: true,
      usageRecords: result,
      alerts: allAlerts,
    };
  }

  /**
   * Get current usage for a subscription
   */
  @Get(':subscriptionId/current')
  async getCurrentUsage(
    @Param('subscriptionId') subscriptionId: string,
    @Request() req: any
  ): Promise<{ success: boolean; usage: Record<string, number> }> {
    const user = req.user as User;

    const usage =
      await this.usageTrackingService.getCurrentUsage(subscriptionId);

    return {
      success: true,
      usage,
    };
  }

  /**
   * Get usage limits for a subscription
   */
  @Get(':subscriptionId/limits')
  async getUsageLimits(
    @Param('subscriptionId') subscriptionId: string,
    @Request() req: any
  ): Promise<{ success: boolean; limits: UsageLimitResponseDto[] }> {
    const user = req.user as User;

    const limits =
      await this.usageTrackingService.getUsageLimits(subscriptionId);

    return {
      success: true,
      limits,
    };
  }

  /**
   * Check usage limits and get alerts
   */
  @Get(':subscriptionId/alerts')
  async checkUsageLimits(
    @Param('subscriptionId') subscriptionId: string,
    @Request() req: any
  ): Promise<{ success: boolean; alerts: UsageAlertResponseDto[] }> {
    const user = req.user as User;

    const alerts =
      await this.usageTrackingService.checkUsageLimits(subscriptionId);

    return {
      success: true,
      alerts,
    };
  }

  /**
   * Get usage analytics for a subscription
   */
  @Get(':subscriptionId/analytics')
  async getUsageAnalytics(
    @Param('subscriptionId') subscriptionId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any
  ): Promise<{ success: boolean; analytics: UsageAnalyticsResponseDto }> {
    const user = req.user as User;

    const analytics = await this.usageTrackingService.getUsageAnalytics(
      subscriptionId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return {
      success: true,
      analytics,
    };
  }

  /**
   * Get usage history for a subscription
   */
  @Get(':subscriptionId/history')
  async getUsageHistory(
    @Param('subscriptionId') subscriptionId: string,
    @Query('metricName') metricName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Request() req?: any
  ): Promise<{ success: boolean; history: any[] }> {
    const user = req.user as User;

    const history = await this.usageTrackingService.getUsageHistory(
      subscriptionId,
      metricName,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit || 100
    );

    return {
      success: true,
      history,
    };
  }

  /**
   * Get usage summary for a tenant
   */
  @Get('tenant/summary')
  async getTenantUsageSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any
  ): Promise<{ success: boolean; summary: TenantUsageSummaryResponseDto }> {
    const user = req.user as User;

    const summary = await this.usageTrackingService.getTenantUsageSummary(
      user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return {
      success: true,
      summary,
    };
  }
}
