import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PdfGeneratorService } from './pdf-generator.service';
import {
  UsageAnalytics,
  AnalyticsAggregate,
  AnalyticsAlert,
  AnalyticsReport,
  AnalyticsEventType,
  AnalyticsMetricType,
} from '../entities/usage-analytics.entity';
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
import { EmailService } from '../../email/services/email.service';
import { StorageManagerService } from '../../files/services/storage-manager.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(UsageAnalytics)
    private readonly analyticsRepository: Repository<UsageAnalytics>,
    @InjectRepository(AnalyticsAggregate)
    private readonly aggregateRepository: Repository<AnalyticsAggregate>,
    @InjectRepository(AnalyticsAlert)
    private readonly alertRepository: Repository<AnalyticsAlert>,
    @InjectRepository(AnalyticsReport)
    private readonly reportRepository: Repository<AnalyticsReport>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly emailService: EmailService,
    private readonly storageManagerService: StorageManagerService
  ) {}

  // Event tracking methods
  async trackEvent(
    tenantId: string,
    userId: string | null,
    eventData: TrackEventDto
  ): Promise<TrackEventResponseDto> {
    try {
      const analytics = new UsageAnalytics();
      analytics.tenantId = tenantId;
      if (userId) analytics.userId = userId;
      analytics.eventType = eventData.eventType;
      analytics.eventName = eventData.eventName;
      if (eventData.description) analytics.description = eventData.description;
      analytics.metricType = eventData.metricType || AnalyticsMetricType.COUNT;
      analytics.metricValue = eventData.metricValue || 1;
      if (eventData.metadata) analytics.metadata = eventData.metadata;
      if (eventData.resourceId) analytics.resourceId = eventData.resourceId;
      if (eventData.resourceType)
        analytics.resourceType = eventData.resourceType;
      if (eventData.sessionId) analytics.sessionId = eventData.sessionId;
      if (eventData.ipAddress) analytics.ipAddress = eventData.ipAddress;
      if (eventData.userAgent) analytics.userAgent = eventData.userAgent;
      analytics.timestamp = eventData.timestamp
        ? new Date(eventData.timestamp)
        : new Date();

      const savedAnalytics = await this.analyticsRepository.save(analytics);

      // Emit event for real-time processing
      this.eventEmitter.emit('analytics.event.tracked', {
        tenantId,
        eventId: savedAnalytics.id,
        eventType: eventData.eventType,
        timestamp: savedAnalytics.timestamp,
      });

      // Check alerts for this event type
      await this.checkAlerts(
        tenantId,
        eventData.eventType,
        savedAnalytics.metricValue
      );

      return {
        id: savedAnalytics.id,
        eventType: savedAnalytics.eventType,
        eventName: savedAnalytics.eventName,
        timestamp: savedAnalytics.timestamp,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to track event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined
      );
      throw new BadRequestException('Failed to track analytics event');
    }
  }

  async bulkTrackEvents(
    tenantId: string,
    userId: string | null,
    bulkData: BulkTrackEventsDto
  ): Promise<BulkTrackEventsResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const results = {
        successCount: 0,
        failureCount: 0,
        errors: [] as Array<{ index: number; error: string }>,
        eventIds: [] as string[],
      };

      for (let i = 0; i < bulkData.events.length; i++) {
        const eventData = bulkData.events[i];
        if (!eventData) continue;

        try {
          const analytics = new UsageAnalytics();
          analytics.tenantId = tenantId;
          if (userId) analytics.userId = userId;
          analytics.eventType = eventData.eventType;
          analytics.eventName = eventData.eventName;
          if (eventData.description)
            analytics.description = eventData.description;
          analytics.metricType =
            eventData.metricType || AnalyticsMetricType.COUNT;
          analytics.metricValue = eventData.metricValue || 1;
          if (eventData.metadata) analytics.metadata = eventData.metadata;
          if (eventData.resourceId) analytics.resourceId = eventData.resourceId;
          if (eventData.resourceType)
            analytics.resourceType = eventData.resourceType;
          if (eventData.sessionId) analytics.sessionId = eventData.sessionId;
          if (eventData.ipAddress) analytics.ipAddress = eventData.ipAddress;
          if (eventData.userAgent) analytics.userAgent = eventData.userAgent;
          analytics.timestamp = eventData.timestamp
            ? new Date(eventData.timestamp)
            : new Date();

          const savedAnalytics = await queryRunner.manager.save(analytics);
          results.successCount++;
          results.eventIds.push(savedAnalytics.id);
        } catch (error) {
          results.failureCount++;
          results.errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return results;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.logger.error(
        `Failed to bulk track events: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined
      );
      throw new BadRequestException('Failed to bulk track analytics events');
    }
  }

  // Query methods
  async getEvents(
    tenantId: string,
    query: AnalyticsQueryDto
  ): Promise<AnalyticsEventResponseDto[]> {
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder('analytics')
      .leftJoinAndSelect('analytics.user', 'user')
      .where('analytics.tenantId = :tenantId', { tenantId });

    if (query.userId) {
      queryBuilder.andWhere('analytics.userId = :userId', {
        userId: query.userId,
      });
    }

    if (query.eventType) {
      queryBuilder.andWhere('analytics.eventType = :eventType', {
        eventType: query.eventType,
      });
    }

    if (query.startDate) {
      queryBuilder.andWhere('analytics.timestamp >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('analytics.timestamp <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    queryBuilder
      .orderBy('analytics.timestamp', 'DESC')
      .skip(query.offset || 0)
      .take(query.limit || 50);

    const events = await queryBuilder.getMany();
    return events.map(event => this.mapToEventResponse(event));
  }

  async getAggregates(
    tenantId: string,
    query: AnalyticsAggregateQueryDto
  ): Promise<AnalyticsAggregateResponseDto[]> {
    const queryBuilder = this.aggregateRepository
      .createQueryBuilder('aggregate')
      .where('aggregate.tenantId = :tenantId', { tenantId });

    if (query.metricName) {
      queryBuilder.andWhere('aggregate.metricName = :metricName', {
        metricName: query.metricName,
      });
    }

    if (query.period) {
      queryBuilder.andWhere('aggregate.period = :period', {
        period: query.period,
      });
    }

    if (query.startDate) {
      queryBuilder.andWhere('aggregate.timestamp >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('aggregate.timestamp <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    queryBuilder.orderBy('aggregate.timestamp', 'DESC').take(query.limit || 50);

    const aggregates = await queryBuilder.getMany();
    return aggregates.map(aggregate => this.mapToAggregateResponse(aggregate));
  }

  async getDashboard(
    tenantId: string,
    period: string = 'day'
  ): Promise<AnalyticsDashboardResponseDto> {
    const [recentEvents, aggregates] = await Promise.all([
      this.getEvents(tenantId, {
        limit: 10,
        sortBy: 'timestamp',
        sortOrder: 'DESC',
      }),
      this.getAggregates(tenantId, { period: period as any, limit: 20 }),
    ]);

    const summary = await this.getSummary(tenantId);

    return {
      summary,
      recentEvents,
      aggregates,
      trends: await this.getTrends(tenantId, period),
      topResources: await this.getTopResources(tenantId, period),
    };
  }

  async getSummary(tenantId: string): Promise<AnalyticsSummaryResponseDto> {
    const [
      totalEvents,
      uniqueUsers,
      activeSessions,
      eventsToday,
      topEvents,
      systemHealth,
    ] = await Promise.all([
      this.getTotalEvents(tenantId),
      this.getUniqueUsers(tenantId),
      this.getActiveSessions(tenantId),
      this.getEventsToday(tenantId),
      this.getTopEvents(tenantId),
      this.getSystemHealth(),
    ]);

    return {
      totalEvents,
      uniqueUsers,
      activeSessions,
      topEvents: topEvents.map(event => ({
        eventType: event.eventType,
        eventName: event.eventType, // Use eventType as eventName for now
        count: event.count,
      })),
      topUsers: [], // Mock data for now
      periodBreakdown: [], // Mock data for now
      categoryBreakdown: [], // Mock data for now
    };
  }

  async getRealTimeMetrics(
    tenantId: string,
    query: RealTimeMetricsDto
  ): Promise<RealTimeMetricsResponseDto> {
    const [
      activeUsers,
      activeSessions,
      eventsPerMinute,
      topEvents,
      systemHealth,
    ] = await Promise.all([
      this.getActiveUsers(tenantId),
      this.getActiveSessions(tenantId),
      this.getEventsPerMinute(tenantId),
      this.getTopEvents(tenantId),
      this.getSystemHealth(),
    ]);

    return {
      activeUsers,
      activeSessions,
      eventsPerMinute,
      topEvents,
      systemHealth,
      lastUpdated: new Date(),
    };
  }

  // Report and export methods
  async generateReport(
    tenantId: string,
    reportData: GenerateReportDto
  ): Promise<ReportResponseDto> {
    const report = new AnalyticsReport();
    report.tenantId = tenantId;
    report.reportType = reportData.reportType;
    report.reportName = reportData.reportName || `Report ${Date.now()}`;
    report.description = reportData.description || '';
    report.status = 'processing';
    report.format = reportData.format || 'json';
    report.metadata = {
      tenantId,
      startDate: reportData.startDate,
      endDate: reportData.endDate,
      metrics: reportData.metrics,
      filters: reportData.filters,
    };

    const savedReport = await this.reportRepository.save(report);

    // Generate the report asynchronously
    this.generateReportAsync(savedReport, reportData);

    return this.mapToReportResponse(savedReport);
  }

  /**
   * Generate report asynchronously
   */
  private async generateReportAsync(
    report: AnalyticsReport,
    reportData: GenerateReportDto
  ): Promise<void> {
    try {
      this.logger.log(`Starting report generation for ${report.id}`);

      // Gather analytics data based on report type
      this.logger.log(`Gathering analytics data for report ${report.id}`);
      const analyticsData = await this.gatherAnalyticsData(
        report.tenantId,
        report.reportType,
        reportData
      );
      this.logger.log(`Analytics data gathered for report ${report.id}`);

      // Generate PDF if format is pdf
      if (report.format === 'pdf') {
        this.logger.log(`Generating PDF for report ${report.id}`);

        try {
          const reportResponse = this.mapToReportResponse(report);
          const { filePath, fileSize } =
            await this.pdfGeneratorService.generateAnalyticsReport(
              reportResponse,
              analyticsData
            );
          this.logger.log(
            `PDF generated successfully for report ${report.id} at ${filePath}`
          );

          // Upload PDF to storage
          this.logger.log(`Uploading PDF to storage for report ${report.id}`);
          const fs = require('fs');
          const path = require('path');

          if (!fs.existsSync(filePath)) {
            throw new Error(`Generated PDF file not found at ${filePath}`);
          }

          const fileBuffer = fs.readFileSync(filePath);
          const storageKey = `analytics/reports/${report.id}/${path.basename(filePath)}`;

          this.logger.log(`Uploading to storage key: ${storageKey}`);

          try {
            const uploadResult = await this.storageManagerService.upload(
              storageKey,
              fileBuffer,
              {
                contentType: 'application/pdf',
                metadata: {
                  reportId: report.id,
                  reportType: report.reportType,
                  tenantId: report.tenantId,
                  generatedAt: new Date().toISOString(),
                },
                public: false,
                expiresIn: 7 * 24 * 60 * 60, // 7 days
              }
            );

            this.logger.log(
              `Storage upload result:`,
              JSON.stringify(uploadResult, null, 2)
            );
            this.logger.log(
              `PDF uploaded successfully for report ${report.id}`
            );

            // Clean up local file
            fs.unlinkSync(filePath);
            this.logger.log(`Local file cleaned up for report ${report.id}`);

            // Update report with storage details
            report.status = 'completed';

            // Ensure we have a valid download URL
            let downloadUrl = `/api/analytics/reports/${report.id}/download`;
            if (
              uploadResult &&
              uploadResult.url &&
              uploadResult.url.trim() !== ''
            ) {
              // Check if it's a valid HTTP URL
              if (
                uploadResult.url.startsWith('http://') ||
                uploadResult.url.startsWith('https://')
              ) {
                downloadUrl = uploadResult.url;
                this.logger.log(`Using storage URL: ${downloadUrl}`);
              } else {
                this.logger.log(
                  `Storage URL is not HTTP, using API endpoint: ${downloadUrl}`
                );
              }
            } else {
              this.logger.log(
                `Storage URL is empty, using API endpoint: ${downloadUrl}`
              );
            }

            // For MinIO/S3, always use the API endpoint to avoid access issues
            // The API endpoint will handle authentication and serve the file properly
            downloadUrl = `/api/analytics/reports/${report.id}/download`;
            this.logger.log(
              `Using API endpoint for secure access: ${downloadUrl}`
            );

            report.downloadUrl = downloadUrl;
            report.fileSize = fileSize;
            report.recordCount = analyticsData.totalEvents || 0;
            report.completedAt = new Date();
            report.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            report.storageKey = storageKey; // Store the storage key for future reference

            this.logger.log(
              `Report ${report.id} completed successfully with download URL: ${report.downloadUrl}`
            );
          } catch (storageError) {
            this.logger.error(
              `Storage upload failed for report ${report.id}: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`
            );
            this.logger.log(
              `Falling back to local storage for report ${report.id}`
            );

            // Fallback to local storage
            const localDownloadUrl = `/api/analytics/reports/${report.id}/download`;

            // Update report with local storage details
            report.status = 'completed';
            report.downloadUrl = localDownloadUrl;
            report.fileSize = fileSize;
            report.recordCount = analyticsData.totalEvents || 0;
            report.completedAt = new Date();
            report.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            report.storageKey = filePath; // Store local file path as storage key

            this.logger.log(
              `Report ${report.id} completed with local storage fallback: ${localDownloadUrl}`
            );
          }
        } catch (pdfError) {
          this.logger.error(
            `PDF generation failed for report ${report.id}: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`
          );
          this.logger.error(
            `PDF generation stack trace: ${pdfError instanceof Error ? pdfError.stack : 'No stack trace'}`
          );

          // Update report with error
          report.status = 'failed';
          report.error = `PDF generation failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`;
          await this.reportRepository.save(report);
          return;
        }
      } else {
        // For other formats, just mark as completed
        this.logger.log(`Marking non-PDF report ${report.id} as completed`);
        report.status = 'completed';
        report.completedAt = new Date();
        report.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      }

      await this.reportRepository.save(report);
      this.logger.log(`Report generation completed for ${report.id}`);
    } catch (error) {
      this.logger.error(
        `Report generation failed for ${report.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.logger.error(
        `Full error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`
      );

      // Update report with error
      report.status = 'failed';
      report.error = error instanceof Error ? error.message : 'Unknown error';
      await this.reportRepository.save(report);
    }
  }

  /**
   * Gather analytics data for report generation
   */
  private async gatherAnalyticsData(
    tenantId: string,
    reportType: string,
    reportData: GenerateReportDto
  ): Promise<any> {
    const query: AnalyticsQueryDto = {};
    if (reportData.startDate) query.startDate = reportData.startDate;
    if (reportData.endDate) query.endDate = reportData.endDate;

    switch (reportType) {
      case 'usage':
        const usageEvents = await this.getEvents(tenantId, query);
        const summary = await this.getSummary(tenantId);
        const aggregates = await this.getAggregates(tenantId, {});

        return {
          totalEvents: usageEvents.length,
          uniqueUsers: summary.uniqueUsers,
          activeSessions: summary.activeSessions,
          recentEvents: usageEvents.slice(0, 10), // Last 10 events
          aggregates: aggregates.slice(0, 10), // Last 10 aggregates
        };

      case 'user_activity':
        const allUserEvents = await this.getEvents(tenantId, query);
        const userEvents = allUserEvents.filter(e => e.userId);
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
        };

      case 'feature_adoption':
        const featureData = await this.getFeatureAdoptionData(tenantId, query);
        return featureData;

      case 'performance':
        const performanceData = await this.getPerformanceData(tenantId);
        return performanceData;

      default:
        return {
          message: 'Report data will be generated based on type',
        };
    }
  }

  /**
   * Get feature adoption data
   */
  private async getFeatureAdoptionData(
    tenantId: string,
    query: AnalyticsQueryDto
  ): Promise<any> {
    // Mock feature adoption data
    return {
      totalFeatures: 15,
      adoptedFeatures: 12,
      adoptionRate: 80,
      topFeatures: [
        { name: 'User Management', adoptionRate: 95 },
        { name: 'Analytics Dashboard', adoptionRate: 85 },
        { name: 'File Upload', adoptionRate: 75 },
      ],
    };
  }

  /**
   * Get performance data
   */
  private async getPerformanceData(tenantId: string): Promise<any> {
    // Mock performance data
    return {
      averageResponseTime: 150,
      uptime: 99.9,
      errorRate: 0.1,
      activeConnections: 25,
    };
  }

  async getReport(
    tenantId: string,
    reportId: string
  ): Promise<ReportResponseDto> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, tenantId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return this.mapToReportResponse(report);
  }

  async exportAnalytics(
    tenantId: string,
    exportData: ExportAnalyticsDto
  ): Promise<ExportResponseDto> {
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const exportJob: ExportResponseDto = {
      id: exportId,
      status: 'pending',
      format: exportData.format || 'json',
      createdAt: new Date(),
      recordCount: 0,
      fileSize: 0,
    };

    // Emit event for background processing
    this.eventEmitter.emit('analytics.export.requested', {
      tenantId,
      exportId,
      exportData,
    });

    return exportJob;
  }

  /**
   * Get export job status and details
   */
  async getExport(
    tenantId: string,
    exportId: string
  ): Promise<ExportResponseDto> {
    try {
      // In a real implementation, this would query a job queue or database
      // to get the status of an export job
      const mockExport: ExportResponseDto = {
        id: exportId,
        status: 'completed', // Could be 'pending', 'processing', 'completed', 'failed'
        format: 'json',
        createdAt: new Date(),
        recordCount: 1000,
        fileSize: 1024 * 1024, // 1MB
        downloadUrl: `https://api.example.com/exports/${exportId}/download`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        error: '',
      };

      return mockExport;
    } catch (error) {
      throw new BadRequestException('Failed to get export details');
    }
  }

  /**
   * Clean up old analytics data
   */
  async cleanupData(tenantId: string, olderThan: string): Promise<void> {
    try {
      const cutoffDate = new Date(olderThan);

      // Validate the date
      if (isNaN(cutoffDate.getTime())) {
        throw new BadRequestException(
          'Invalid date format for olderThan parameter'
        );
      }

      // Delete old analytics events
      const deletedEvents = await this.analyticsRepository
        .createQueryBuilder('event')
        .delete()
        .where('event.tenantId = :tenantId', { tenantId })
        .andWhere('event.timestamp < :cutoffDate', { cutoffDate })
        .execute();

      // Delete old aggregates
      const deletedAggregates = await this.aggregateRepository
        .createQueryBuilder('aggregate')
        .delete()
        .where('aggregate.tenantId = :tenantId', { tenantId })
        .andWhere('aggregate.timestamp < :cutoffDate', { cutoffDate })
        .execute();

      // Delete old reports (keep for 30 days)
      const reportCutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const deletedReports = await this.reportRepository
        .createQueryBuilder('report')
        .delete()
        .where('report.tenantId = :tenantId', { tenantId })
        .andWhere('report.createdAt < :reportCutoffDate', { reportCutoffDate })
        .execute();

      this.logger.log(
        `Cleaned up analytics data for tenant ${tenantId}: ${deletedEvents.affected} events, ${deletedAggregates.affected} aggregates, ${deletedReports.affected} reports deleted`
      );
    } catch (error) {
      this.logger.error(
        `Failed to cleanup analytics data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw new BadRequestException('Failed to cleanup analytics data');
    }
  }

  // Alert management methods
  async createAlert(
    tenantId: string,
    alertData: CreateAlertDto
  ): Promise<AlertResponseDto> {
    const alert = new AnalyticsAlert();
    alert.tenantId = tenantId;
    alert.alertName = alertData.alertName;
    alert.description = alertData.description;
    alert.severity = alertData.severity;
    alert.metricName = alertData.metricName;
    alert.condition = alertData.condition;
    alert.threshold = alertData.threshold;
    alert.isActive =
      alertData.isActive !== undefined ? alertData.isActive : true;
    if (alertData.metadata) alert.metadata = alertData.metadata;

    const savedAlert = await this.alertRepository.save(alert);
    return this.mapToAlertResponse(savedAlert);
  }

  async updateAlert(
    tenantId: string,
    alertId: string,
    updateData: UpdateAlertDto
  ): Promise<AlertResponseDto> {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId, tenantId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    Object.assign(alert, updateData);
    const savedAlert = await this.alertRepository.save(alert);
    return this.mapToAlertResponse(savedAlert);
  }

  async getAlerts(tenantId: string): Promise<AlertResponseDto[]> {
    const alerts = await this.alertRepository
      .createQueryBuilder('alert')
      .where('alert.tenantId = :tenantId', { tenantId })
      .orderBy('alert.createdAt', 'DESC')
      .getMany();

    return alerts.map(alert => this.mapToAlertResponse(alert));
  }

  async deleteAlert(
    tenantId: string,
    alertId: string
  ): Promise<{ success: boolean; message: string }> {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId, tenantId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    await this.alertRepository.remove(alert);
    return { success: true, message: 'Alert deleted successfully' };
  }

  // Health check methods
  async getHealth(tenantId: string): Promise<AnalyticsHealthResponseDto> {
    const [database, cache, queue, storage] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkCacheHealth(),
      this.checkQueueHealth(),
      this.checkStorageHealth(),
    ]);

    const [totalEvents, eventsToday, activeAlerts, storageUsed] =
      await Promise.all([
        this.getTotalEvents(tenantId),
        this.getEventsToday(tenantId),
        this.getActiveAlerts(tenantId),
        this.getStorageUsed(tenantId),
      ]);

    const status =
      database && cache && queue && storage ? 'healthy' : 'degraded';

    return {
      status,
      checks: { database, cache, queue, storage },
      metrics: { totalEvents, eventsToday, activeAlerts, storageUsed },
      lastUpdated: new Date(),
    };
  }

  // Cron jobs for data aggregation
  @Cron(CronExpression.EVERY_HOUR)
  async aggregateHourlyData(): Promise<void> {
    this.logger.log('Starting hourly analytics aggregation');
    await this.aggregateData('hour');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyData(): Promise<void> {
    this.logger.log('Starting daily analytics aggregation');
    await this.aggregateData('day');
  }

  @Cron(CronExpression.EVERY_WEEK)
  async aggregateWeeklyData(): Promise<void> {
    this.logger.log('Starting weekly analytics aggregation');
    await this.aggregateData('week');
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async aggregateMonthlyData(): Promise<void> {
    this.logger.log('Starting monthly analytics aggregation');
    await this.aggregateData('month');
  }

  // Private helper methods
  private async checkAlerts(
    tenantId: string,
    eventType: AnalyticsEventType,
    metricValue: number
  ): Promise<void> {
    const alerts = await this.alertRepository.find({
      where: { tenantId, isActive: true },
    });

    for (const alert of alerts) {
      if (
        alert.metricName === eventType &&
        alert.isThresholdExceeded(metricValue)
      ) {
        await this.triggerAlert(alert);
      }
    }
  }

  private async triggerAlert(alert: AnalyticsAlert): Promise<void> {
    if (!alert.shouldTriggerAlert()) {
      return;
    }

    alert.markAsTriggered();
    await this.alertRepository.save(alert);

    // Send notification
    this.eventEmitter.emit('analytics.alert.triggered', {
      alertId: alert.id,
      tenantId: alert.tenantId,
      alertName: alert.alertName,
      severity: alert.severity,
      metricName: alert.metricName,
      threshold: alert.threshold,
    });

    // Send email notification for critical alerts
    if (alert.severity === 'critical' || alert.severity === 'high') {
      await this.sendAlertNotification(alert);
    }
  }

  private async sendAlertNotification(alert: AnalyticsAlert): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: 'admin@example.com', // This should be configurable
        subject: `Analytics Alert: ${alert.alertName}`,
        template: 'analytics-alert',
        context: {
          alertName: alert.alertName,
          description: alert.description,
          severity: alert.severity,
          metricName: alert.metricName,
          threshold: alert.threshold,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send alert notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async aggregateData(period: string): Promise<void> {
    try {
      // Get all tenants
      const tenants = await this.analyticsRepository
        .createQueryBuilder('analytics')
        .select('DISTINCT analytics.tenantId', 'tenantId')
        .getRawMany();

      for (const tenant of tenants) {
        await this.aggregateTenantData(tenant.tenantId, period);
      }

      this.eventEmitter.emit('analytics.aggregation.completed', {
        period,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to aggregate data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async aggregateTenantData(
    tenantId: string,
    period: string
  ): Promise<void> {
    try {
      const startDate = this.getStartDateForPeriod(period);
      const endDate = new Date();

      const events = await this.analyticsRepository
        .createQueryBuilder('analytics')
        .where('analytics.tenantId = :tenantId', { tenantId })
        .andWhere('analytics.timestamp >= :startDate', { startDate })
        .andWhere('analytics.timestamp <= :endDate', { endDate })
        .getMany();

      // Group events by metric name
      const groupedEvents = events.reduce(
        (acc, event) => {
          const key = event.eventType;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(event);
          return acc;
        },
        {} as Record<string, UsageAnalytics[]>
      );

      // Create aggregates for each metric
      for (const [metricName, metricEvents] of Object.entries(groupedEvents)) {
        const totalValue = metricEvents.reduce(
          (sum, event) => sum + event.metricValue,
          0
        );
        const averageValue = totalValue / metricEvents.length;
        const minValue = Math.min(...metricEvents.map(e => e.metricValue));
        const maxValue = Math.max(...metricEvents.map(e => e.metricValue));

        const aggregate = this.aggregateRepository.create({
          tenantId,
          metricName,
          period,
          totalValue,
          averageValue,
          count: metricEvents.length,
          minValue,
          maxValue,
          breakdown: {},
          timestamp: endDate,
        });

        await this.aggregateRepository.save(aggregate);
      }
    } catch (error) {
      this.logger.error(
        `Failed to aggregate data for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private getStartDateForPeriod(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  // Mock methods for metrics (these would be implemented based on actual requirements)
  private async getTotalEvents(tenantId: string): Promise<number> {
    return this.analyticsRepository.count({ where: { tenantId } });
  }

  private async getUniqueUsers(tenantId: string): Promise<number> {
    const result = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('COUNT(DISTINCT analytics.userId)', 'count')
      .where('analytics.tenantId = :tenantId', { tenantId })
      .getRawOne();
    return parseInt(result?.count || '0', 10);
  }

  private async getActiveSessions(tenantId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.tenantId = :tenantId', { tenantId })
      .andWhere('analytics.timestamp >= :oneHourAgo', { oneHourAgo })
      .getCount();
  }

  private async getEventsToday(tenantId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.tenantId = :tenantId', { tenantId })
      .andWhere('analytics.timestamp >= :today', { today })
      .getCount();
  }

  private async getActiveUsers(tenantId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const result = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('COUNT(DISTINCT analytics.userId)', 'count')
      .where('analytics.tenantId = :tenantId', { tenantId })
      .andWhere('analytics.timestamp >= :oneHourAgo', { oneHourAgo })
      .getRawOne();
    return parseInt(result?.count || '0', 10);
  }

  private async getEventsPerMinute(tenantId: string): Promise<number> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    return this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.tenantId = :tenantId', { tenantId })
      .andWhere('analytics.timestamp >= :oneMinuteAgo', { oneMinuteAgo })
      .getCount();
  }

  private async getTopEvents(
    tenantId: string
  ): Promise<Array<{ eventType: AnalyticsEventType; count: number }>> {
    const result = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.tenantId = :tenantId', { tenantId })
      .groupBy('analytics.eventType')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map(row => ({
      eventType: row.eventType as AnalyticsEventType,
      count: parseInt(row.count, 10),
    }));
  }

  private async getSystemHealth(): Promise<{
    cpu: number;
    memory: number;
    responseTime: number;
  }> {
    // Mock system health data
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      responseTime: Math.random() * 1000,
    };
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.analyticsRepository.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkCacheHealth(): Promise<boolean> {
    // Mock cache health check
    return true;
  }

  private async checkQueueHealth(): Promise<boolean> {
    // Mock queue health check
    return true;
  }

  private async checkStorageHealth(): Promise<boolean> {
    // Mock storage health check
    return true;
  }

  private async getActiveAlerts(tenantId: string): Promise<number> {
    return this.alertRepository.count({
      where: { tenantId, isActive: true },
    });
  }

  private async getStorageUsed(tenantId: string): Promise<number> {
    // Mock storage usage
    return Math.random() * 1024 * 1024; // Random bytes
  }

  private async getTrends(
    tenantId: string,
    period: string
  ): Promise<Array<{ date: string; count: number; uniqueUsers: number }>> {
    const dates = [];
    const now = new Date();
    const days = period === 'day' ? 7 : period === 'week' ? 4 : 12;

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateString = date.toISOString().split('T')[0];
      if (dateString) {
        dates.push({
          date: dateString,
          count: Math.floor(Math.random() * 100),
          uniqueUsers: Math.floor(Math.random() * 20),
        });
      }
    }

    return dates.reverse();
  }

  private async getTopResources(
    tenantId: string,
    period: string
  ): Promise<
    Array<{ resourceType: string; resourceId: string; accessCount: number }>
  > {
    // Mock top resources data
    return [
      { resourceType: 'page', resourceId: 'dashboard', accessCount: 150 },
      { resourceType: 'api', resourceId: '/users', accessCount: 120 },
      { resourceType: 'file', resourceId: 'document.pdf', accessCount: 80 },
    ];
  }

  // Mapping methods
  private mapToEventResponse(event: UsageAnalytics): AnalyticsEventResponseDto {
    return {
      id: event.id,
      tenantId: event.tenantId,
      userId: event.userId ?? '',
      eventType: event.eventType,
      eventName: event.eventName,
      description: event.description || '',
      metricType: event.metricType,
      metricValue: event.metricValue,
      metadata: event.metadata || undefined,
      resourceId: event.resourceId || undefined,
      resourceType: event.resourceType || undefined,
      sessionId: event.sessionId || undefined,
      ipAddress: event.ipAddress || undefined,
      userAgent: event.userAgent || undefined,
      timestamp: event.timestamp,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      eventCategory: event.getEventCategory(),
      user: event.user
        ? {
            id: event.user.id,
            email: event.user.email,
            firstName: event.user.firstName,
            lastName: event.user.lastName,
          }
        : undefined,
    };
  }

  private mapToAggregateResponse(
    aggregate: AnalyticsAggregate
  ): AnalyticsAggregateResponseDto {
    return {
      id: aggregate.id,
      tenantId: aggregate.tenantId,
      metricName: aggregate.metricName,
      period: aggregate.period,
      totalValue: aggregate.totalValue,
      averageValue: aggregate.averageValue,
      count: aggregate.count,
      minValue: aggregate.minValue,
      maxValue: aggregate.maxValue,
      breakdown: aggregate.breakdown || undefined,
      timestamp: aggregate.timestamp,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }

  private mapToAlertResponse(alert: AnalyticsAlert): AlertResponseDto {
    return {
      id: alert.id,
      tenantId: alert.tenantId,
      alertName: alert.alertName,
      description: alert.description || '',
      severity: alert.severity,
      metricName: alert.metricName,
      condition: alert.condition,
      threshold: alert.threshold,
      isActive: alert.isActive,
      isTriggered: alert.triggerCount > 0,
      lastTriggeredAt: alert.lastTriggeredAt || undefined,
      metadata: alert.metadata || undefined,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  private mapToReportResponse(report: AnalyticsReport): ReportResponseDto {
    return {
      id: report.id,
      reportType: report.reportType,
      reportName: report.reportName,
      description: report.description || '',
      status: report.status,
      format: report.format,
      downloadUrl: report.downloadUrl || '',
      expiresAt: report.expiresAt || new Date(),
      metadata: report.metadata || {},
      createdAt: report.createdAt,
      completedAt: report.completedAt || new Date(),
      error: report.error || '',
      storageKey: report.storageKey || '',
    };
  }

  /**
   * Download report from storage
   */
  async downloadReportFromStorage(storageKey: string): Promise<Buffer> {
    try {
      return await this.storageManagerService.download(storageKey);
    } catch (error) {
      this.logger.error(
        `Failed to download report from storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw new NotFoundException('Report file not found in storage');
    }
  }
}
