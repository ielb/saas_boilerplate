import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Res,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import {
  PermissionAction,
  PermissionResource,
} from '../../rbac/entities/permission.entity';
import { AnalyticsService } from '../services/analytics.service';
import {
  TrackEventDto,
  TrackEventResponseDto,
  AnalyticsQueryDto,
  AnalyticsAggregateQueryDto,
  AnalyticsEventResponseDto,
  AnalyticsAggregateResponseDto,
  AnalyticsSummaryResponseDto,
  AnalyticsDashboardResponseDto,
  GenerateReportDto,
  ReportResponseDto,
  CreateAlertDto,
  UpdateAlertDto,
  AlertResponseDto,
  ExportAnalyticsDto,
  ExportResponseDto,
  RealTimeMetricsDto,
  RealTimeMetricsResponseDto,
  BulkTrackEventsDto,
  BulkTrackEventsResponseDto,
  AnalyticsHealthResponseDto,
} from '../dto/analytics.dto';
import { TenantScopingInterceptor } from '../../../common/interceptors/tenant-scoping.interceptor';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(TenantScopingInterceptor)
@ApiBearerAuth()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  // Event tracking endpoints
  @Post('events/track')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.CREATE,
  })
  @ApiOperation({ summary: 'Track a single analytics event' })
  @ApiResponse({
    status: 201,
    description: 'Event tracked successfully',
    type: TrackEventResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid event data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async trackEvent(
    @TenantId() tenantId: string,
    @Body() eventData: TrackEventDto
  ): Promise<TrackEventResponseDto> {
    return this.analyticsService.trackEvent(tenantId, null, eventData);
  }

  @Post('events/track/bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.CREATE,
  })
  @ApiOperation({ summary: 'Track multiple analytics events in bulk' })
  @ApiResponse({
    status: 201,
    description: 'Events tracked successfully',
    type: BulkTrackEventsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid event data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async bulkTrackEvents(
    @TenantId() tenantId: string,
    @Body() bulkData: BulkTrackEventsDto
  ): Promise<BulkTrackEventsResponseDto> {
    return this.analyticsService.bulkTrackEvents(tenantId, null, bulkData);
  }

  // Query endpoints
  @Get('events')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({
    summary: 'Get analytics events with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
    type: [AnalyticsEventResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    description: 'Filter by event type',
  })
  @ApiQuery({
    name: 'eventName',
    required: false,
    description: 'Filter by event name',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by start date',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter by end date',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records to return',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of records to skip',
    type: Number,
  })
  async getEvents(
    @TenantId() tenantId: string,
    @Query() query: AnalyticsQueryDto
  ): Promise<AnalyticsEventResponseDto[]> {
    return this.analyticsService.getEvents(tenantId, query);
  }

  @Get('aggregates')
  @ApiOperation({ summary: 'Get analytics aggregates' })
  @ApiResponse({
    status: 200,
    description: 'Analytics aggregates retrieved successfully',
    type: [AnalyticsAggregateResponseDto],
  })
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  async getAggregates(
    @TenantId() tenantId: string,
    @Query() query: AnalyticsAggregateQueryDto
  ): Promise<AnalyticsAggregateResponseDto[]> {
    const queryParams: AnalyticsAggregateQueryDto = {};
    if (query.metricName) queryParams.metricName = query.metricName;
    if (query.period) queryParams.period = query.period;
    if (query.startDate) queryParams.startDate = query.startDate;
    if (query.endDate) queryParams.endDate = query.endDate;
    return this.analyticsService.getAggregates(tenantId, queryParams);
  }

  // Dashboard and summary endpoints
  @Get('dashboard')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get analytics dashboard with comprehensive data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: AnalyticsDashboardResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Time period for dashboard data',
    example: 'day',
  })
  async getDashboard(
    @TenantId() tenantId: string,
    @Query('period') period: string = 'day'
  ): Promise<AnalyticsDashboardResponseDto> {
    return this.analyticsService.getDashboard(tenantId, period);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get analytics summary' })
  @ApiResponse({
    status: 200,
    description: 'Analytics summary retrieved successfully',
    type: AnalyticsSummaryResponseDto,
  })
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  async getSummary(
    @TenantId() tenantId: string,
    @Query('period') period?: string
  ): Promise<AnalyticsSummaryResponseDto> {
    return this.analyticsService.getSummary(tenantId);
  }

  // Real-time endpoints
  @Get('realtime')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get real-time analytics metrics' })
  @ApiResponse({
    status: 200,
    description: 'Real-time metrics retrieved successfully',
    type: RealTimeMetricsResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getRealTimeMetrics(
    @TenantId() tenantId: string,
    @Query() query: RealTimeMetricsDto
  ): Promise<RealTimeMetricsResponseDto> {
    return this.analyticsService.getRealTimeMetrics(tenantId, query);
  }

  // Report generation endpoints
  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.CREATE,
  })
  @ApiOperation({ summary: 'Generate analytics report' })
  @ApiResponse({
    status: 201,
    description: 'Report generation started',
    type: ReportResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid report configuration' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async generateReport(
    @TenantId() tenantId: string,
    @Body() reportData: GenerateReportDto
  ): Promise<ReportResponseDto> {
    return this.analyticsService.generateReport(tenantId, reportData);
  }

  @Get('reports/:reportId')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get report status and details' })
  @ApiResponse({
    status: 200,
    description: 'Report details retrieved successfully',
    type: ReportResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getReport(
    @TenantId() tenantId: string,
    @Param('reportId') reportId: string
  ): Promise<ReportResponseDto> {
    return this.analyticsService.getReport(tenantId, reportId);
  }

  @Get('reports/:reportId/download')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Download report file' })
  @ApiResponse({
    status: 200,
    description: 'Report file downloaded successfully',
  })
  @ApiResponse({ status: 404, description: 'Report not found or not ready' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async downloadReport(
    @TenantId() tenantId: string,
    @Param('reportId') reportId: string,
    @Res() res: any
  ) {
    const report = await this.analyticsService.getReport(tenantId, reportId);

    if (report.status !== 'completed') {
      throw new NotFoundException('Report is not ready for download');
    }

    if (!report.downloadUrl || report.downloadUrl === '') {
      throw new NotFoundException('Report file not found');
    }

    // If the download URL is already a storage URL, redirect to it
    if (report.downloadUrl.startsWith('http')) {
      return res.redirect(report.downloadUrl);
    }

    // Otherwise, serve from storage using the storage key
    if (report.storageKey) {
      try {
        // Check if storageKey is a local file path (fallback case)
        if (
          report.storageKey.includes('/') &&
          !report.storageKey.startsWith('analytics/')
        ) {
          // Local file path fallback
          const fs = require('fs');
          const path = require('path');

          if (fs.existsSync(report.storageKey)) {
            const fileName = path.basename(report.storageKey);
            const fileBuffer = fs.readFileSync(report.storageKey);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${fileName}"`
            );
            res.setHeader('Content-Length', fileBuffer.length);

            res.send(fileBuffer);
            return;
          } else {
            this.logger.error(`Local file not found: ${report.storageKey}`);
            throw new NotFoundException('Local report file not found');
          }
        } else if (report.storageKey.startsWith('analytics/')) {
          // Cloud storage key
          const fileBuffer =
            await this.analyticsService.downloadReportFromStorage(
              report.storageKey
            );
          const fileName =
            report.storageKey.split('/').pop() || `report-${reportId}.pdf`;

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${fileName}"`
          );
          res.setHeader('Content-Length', fileBuffer.length);

          res.send(fileBuffer);
        } else {
          throw new NotFoundException('Invalid storage key format');
        }
      } catch (error) {
        throw new NotFoundException('Report file not found in storage');
      }
    } else {
      throw new NotFoundException('Report file not found');
    }
  }

  // Alert management endpoints
  @Post('alerts')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.CREATE,
  })
  @ApiOperation({ summary: 'Create analytics alert' })
  @ApiResponse({
    status: 201,
    description: 'Alert created successfully',
    type: AlertResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid alert configuration' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createAlert(
    @TenantId() tenantId: string,
    @Body() alertData: CreateAlertDto
  ): Promise<AlertResponseDto> {
    return this.analyticsService.createAlert(tenantId, alertData);
  }

  @Get('alerts')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get all analytics alerts' })
  @ApiResponse({
    status: 200,
    description: 'Alerts retrieved successfully',
    type: [AlertResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getAlerts(@TenantId() tenantId: string): Promise<AlertResponseDto[]> {
    return this.analyticsService.getAlerts(tenantId);
  }

  @Get('alerts/:alertId')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get specific analytics alert' })
  @ApiResponse({
    status: 200,
    description: 'Alert retrieved successfully',
    type: AlertResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getAlert(
    @TenantId() tenantId: string,
    @Param('alertId') alertId: string
  ): Promise<AlertResponseDto> {
    const alerts = await this.analyticsService.getAlerts(tenantId);
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }
    return alert;
  }

  @Put('alerts/:alertId')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.UPDATE,
  })
  @ApiOperation({ summary: 'Update analytics alert' })
  @ApiResponse({
    status: 200,
    description: 'Alert updated successfully',
    type: AlertResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid alert configuration' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateAlert(
    @TenantId() tenantId: string,
    @Param('alertId') alertId: string,
    @Body() alertData: UpdateAlertDto
  ): Promise<AlertResponseDto> {
    return this.analyticsService.updateAlert(tenantId, alertId, alertData);
  }

  @Delete('alerts/:id')
  @ApiOperation({ summary: 'Delete an alert' })
  @ApiResponse({
    status: 200,
    description: 'Alert deleted successfully',
  })
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.DELETE,
  })
  async deleteAlert(
    @TenantId() tenantId: string,
    @Param('id') alertId: string
  ): Promise<void> {
    await this.analyticsService.deleteAlert(tenantId, alertId);
  }

  // Export endpoints
  @Post('export')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.CREATE,
  })
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiResponse({
    status: 201,
    description: 'Export job created successfully',
    type: ExportResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid export configuration' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async exportAnalytics(
    @TenantId() tenantId: string,
    @Body() exportData: ExportAnalyticsDto
  ): Promise<ExportResponseDto> {
    return this.analyticsService.exportAnalytics(tenantId, exportData);
  }

  @Get('export/:exportId')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get export job status and details' })
  @ApiResponse({
    status: 200,
    description: 'Export details retrieved successfully',
    type: ExportResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Export job not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getExport(
    @TenantId() tenantId: string,
    @Param('exportId') exportId: string
  ): Promise<ExportResponseDto> {
    return this.analyticsService.getExport(tenantId, exportId);
  }

  // Health check endpoint
  @Get('health')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get analytics system health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
    type: AnalyticsHealthResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getHealth(
    @TenantId() tenantId: string
  ): Promise<AnalyticsHealthResponseDto> {
    return this.analyticsService.getHealth(tenantId);
  }

  // Statistics endpoints
  @Get('stats/events')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get event statistics' })
  @ApiResponse({
    status: 200,
    description: 'Event statistics retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for statistics',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for statistics',
  })
  async getEventStats(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const query: AnalyticsQueryDto = {};
    if (startDate) query.startDate = startDate;
    if (endDate) query.endDate = endDate;

    const events = await this.analyticsService.getEvents(tenantId, query);
    const totalEvents = events.length;
    const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId))
      .size;
    const eventTypes = events.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalEvents,
      uniqueUsers,
      eventTypes,
      period: { startDate, endDate },
    };
  }

  @Get('stats/users')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get user activity statistics' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for statistics',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for statistics',
  })
  async getUserStats(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const query: AnalyticsQueryDto = {};
    if (startDate) query.startDate = startDate;
    if (endDate) query.endDate = endDate;

    const events = await this.analyticsService.getEvents(tenantId, query);
    const userEvents = events.filter(e => e.userId);
    const userActivity = userEvents.reduce(
      (acc, event) => {
        const userId = event.userId!;
        if (!acc[userId]) {
          acc[userId] = {
            userId: userId,
            email: event.user?.email,
            eventCount: 0,
            lastActivity: event.timestamp,
            eventTypes: new Set(),
          };
        }
        acc[userId].eventCount++;
        acc[userId].eventTypes.add(event.eventType);
        if (event.timestamp > acc[userId].lastActivity) {
          acc[userId].lastActivity = event.timestamp;
        }
        return acc;
      },
      {} as Record<string, any>
    );

    const activeUsers = Object.values(userActivity).length;
    const totalUserEvents = userEvents.length;
    const averageEventsPerUser =
      activeUsers > 0 ? totalUserEvents / activeUsers : 0;

    return {
      activeUsers,
      totalUserEvents,
      averageEventsPerUser,
      userActivity: Object.values(userActivity).map(user => ({
        ...user,
        eventTypes: Array.from(user.eventTypes),
      })),
      period: { startDate, endDate },
    };
  }

  @Get('stats/performance')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get performance statistics' })
  @ApiResponse({
    status: 200,
    description: 'Performance statistics retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getPerformanceStats(@TenantId() tenantId: string) {
    const realTimeMetrics = await this.analyticsService.getRealTimeMetrics(
      tenantId,
      {}
    );
    const health = await this.analyticsService.getHealth(tenantId);

    return {
      realTime: realTimeMetrics,
      systemHealth: health,
      timestamp: new Date(),
    };
  }

  // Custom analytics endpoints
  @Get('custom/:metricName')
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get custom analytics metric' })
  @ApiResponse({
    status: 200,
    description: 'Custom metric retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for metric',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for metric',
  })
  @ApiQuery({ name: 'groupBy', required: false, description: 'Group by field' })
  async getCustomMetric(
    @TenantId() tenantId: string,
    @Param('metricName') metricName: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string
  ) {
    const query: AnalyticsAggregateQueryDto = {};
    if (metricName) query.metricName = metricName;
    if (startDate) query.startDate = startDate;
    if (endDate) query.endDate = endDate;

    const aggregates = await this.analyticsService.getAggregates(
      tenantId,
      query
    );

    return {
      metricName,
      data: aggregates,
      period: { startDate, endDate },
      groupBy,
    };
  }

  // Data cleanup endpoint (admin only)
  @Delete('cleanup')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({
    resource: PermissionResource.ANALYTICS,
    action: PermissionAction.DELETE,
  })
  @ApiOperation({ summary: 'Clean up old analytics data' })
  @ApiResponse({
    status: 204,
    description: 'Data cleanup completed successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({
    name: 'olderThan',
    required: true,
    description: 'Delete data older than this date',
  })
  async cleanupData(
    @TenantId() tenantId: string,
    @Query('olderThan') olderThan: string
  ): Promise<void> {
    await this.analyticsService.cleanupData(tenantId, olderThan);
  }
}
