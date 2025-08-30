import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from '../services/analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { TenantScopingInterceptor } from '../../../common/interceptors/tenant-scoping.interceptor';
import {
  TrackEventDto,
  AnalyticsQueryDto,
  AnalyticsAggregateQueryDto,
  GenerateReportDto,
  CreateAlertDto,
  UpdateAlertDto,
  ExportAnalyticsDto,
  RealTimeMetricsDto,
  BulkTrackEventsDto,
} from '../dto/analytics.dto';
import {
  AnalyticsEventType,
  AnalyticsMetricType,
} from '../entities/usage-analytics.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockAnalyticsService = {
    trackEvent: jest.fn(),
    bulkTrackEvents: jest.fn(),
    getEvents: jest.fn(),
    getAggregates: jest.fn(),
    getDashboard: jest.fn(),
    getSummary: jest.fn(),
    getRealTimeMetrics: jest.fn(),
    generateReport: jest.fn(),
    getReport: jest.fn(),
    createAlert: jest.fn(),
    getAlerts: jest.fn(),
    updateAlert: jest.fn(),
    deleteAlert: jest.fn(),
    exportAnalytics: jest.fn(),
    getHealth: jest.fn(),
    getExport: jest.fn(),
    cleanupData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(TenantScopingInterceptor)
      .useValue({ intercept: () => true })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('trackEvent', () => {
    const tenantId = 'tenant-123';
    const eventData: TrackEventDto = {
      eventType: AnalyticsEventType.USER_LOGIN,
      eventName: 'User Login',
      metricType: AnalyticsMetricType.COUNT,
      metricValue: 1,
    };

    it('should track a single event successfully', async () => {
      const expectedResponse = {
        id: 'event-123',
        tenantId,
        userId: null,
        ...eventData,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAnalyticsService.trackEvent.mockResolvedValue(expectedResponse);

      const result = await controller.trackEvent(tenantId, eventData);

      expect(service.trackEvent).toHaveBeenCalledWith(
        tenantId,
        null,
        eventData
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('bulkTrackEvents', () => {
    const tenantId = 'tenant-123';
    const bulkData: BulkTrackEventsDto = {
      events: [
        {
          eventType: AnalyticsEventType.USER_LOGIN,
          eventName: 'User Login',
          metricType: AnalyticsMetricType.COUNT,
          metricValue: 1,
        },
      ],
    };

    it('should track multiple events successfully', async () => {
      const expectedResponse = {
        successCount: 1,
        failureCount: 0,
        errors: [],
      };

      mockAnalyticsService.bulkTrackEvents.mockResolvedValue(expectedResponse);

      const result = await controller.bulkTrackEvents(tenantId, bulkData);

      expect(service.bulkTrackEvents).toHaveBeenCalledWith(
        tenantId,
        null,
        bulkData
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getEvents', () => {
    const tenantId = 'tenant-123';
    const query: AnalyticsQueryDto = {
      userId: 'user-123',
      eventType: AnalyticsEventType.USER_LOGIN,
      limit: 10,
    };

    it('should get events with filters', async () => {
      const expectedResponse = [
        {
          id: 'event-123',
          tenantId,
          userId: 'user-123',
          eventType: AnalyticsEventType.USER_LOGIN,
          eventName: 'User Login',
          timestamp: new Date(),
        },
      ];

      mockAnalyticsService.getEvents.mockResolvedValue(expectedResponse);

      const result = await controller.getEvents(tenantId, query);

      expect(service.getEvents).toHaveBeenCalledWith(tenantId, query);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getAggregates', () => {
    const tenantId = 'tenant-123';
    const query: AnalyticsAggregateQueryDto = {
      metricName: 'user_login',
      period: 'day',
    };

    it('should get aggregates with filters', async () => {
      const expectedResponse = [
        {
          id: 'aggregate-123',
          tenantId,
          metricName: 'user_login',
          period: 'day',
          totalValue: 100,
          count: 50,
          timestamp: new Date(),
        },
      ];

      mockAnalyticsService.getAggregates.mockResolvedValue(expectedResponse);

      const result = await controller.getAggregates(tenantId, query);

      expect(service.getAggregates).toHaveBeenCalledWith(tenantId, query);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getDashboard', () => {
    const tenantId = 'tenant-123';
    const period = 'day';

    it('should get dashboard data', async () => {
      const expectedResponse = {
        summary: {
          totalEvents: 100,
          uniqueUsers: 50,
          activeSessions: 10,
        },
        recentEvents: [],
        aggregates: [],
        trends: [],
        topResources: [],
      };

      mockAnalyticsService.getDashboard.mockResolvedValue(expectedResponse);

      const result = await controller.getDashboard(tenantId, period);

      expect(service.getDashboard).toHaveBeenCalledWith(tenantId, period);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getSummary', () => {
    const tenantId = 'tenant-123';

    it('should get analytics summary', async () => {
      const expectedResponse = {
        totalEvents: 100,
        uniqueUsers: 50,
        activeSessions: 10,
        topEvents: [],
        topUsers: [],
        periodBreakdown: [],
        categoryBreakdown: [],
      };

      mockAnalyticsService.getSummary.mockResolvedValue(expectedResponse);

      const result = await controller.getSummary(tenantId);

      expect(service.getSummary).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getRealTimeMetrics', () => {
    const tenantId = 'tenant-123';
    const query: RealTimeMetricsDto = {
      sessionId: 'session-123',
    };

    it('should get real-time metrics', async () => {
      const expectedResponse = {
        activeUsers: 10,
        activeSessions: 5,
        eventsPerMinute: 2,
        topEvents: [],
        systemHealth: {
          cpu: 50,
          memory: 60,
          responseTime: 200,
        },
        lastUpdated: new Date(),
      };

      mockAnalyticsService.getRealTimeMetrics.mockResolvedValue(
        expectedResponse
      );

      const result = await controller.getRealTimeMetrics(tenantId, query);

      expect(service.getRealTimeMetrics).toHaveBeenCalledWith(tenantId, query);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('generateReport', () => {
    const tenantId = 'tenant-123';
    const reportData: GenerateReportDto = {
      reportType: 'user_activity',
      reportName: 'User Activity Report',
      format: 'json',
    };

    it('should generate report successfully', async () => {
      const expectedResponse = {
        id: 'report-123',
        reportType: 'user_activity',
        reportName: 'User Activity Report',
        status: 'pending',
        format: 'json',
        createdAt: new Date(),
      };

      mockAnalyticsService.generateReport.mockResolvedValue(expectedResponse);

      const result = await controller.generateReport(tenantId, reportData);

      expect(service.generateReport).toHaveBeenCalledWith(tenantId, reportData);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getReport', () => {
    const tenantId = 'tenant-123';
    const reportId = 'report-123';

    it('should get report successfully', async () => {
      const expectedResponse = {
        id: 'report-123',
        reportType: 'user_activity',
        status: 'completed',
        format: 'json',
        createdAt: new Date(),
      };

      mockAnalyticsService.getReport.mockResolvedValue(expectedResponse);

      const result = await controller.getReport(tenantId, reportId);

      expect(service.getReport).toHaveBeenCalledWith(tenantId, reportId);
      expect(result).toEqual(expectedResponse);
    });

    it('should throw NotFoundException when report not found', async () => {
      mockAnalyticsService.getReport.mockRejectedValue(
        new NotFoundException('Report not found')
      );

      await expect(controller.getReport(tenantId, reportId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('createAlert', () => {
    const tenantId = 'tenant-123';
    const alertData: CreateAlertDto = {
      alertName: 'High Login Rate',
      description: 'Alert when login rate exceeds threshold',
      severity: 'high',
      metricName: 'user_login',
      condition: 'gt',
      threshold: 100,
    };

    it('should create alert successfully', async () => {
      const expectedResponse = {
        id: 'alert-123',
        tenantId,
        alertName: 'High Login Rate',
        description: 'Alert when login rate exceeds threshold',
        severity: 'high',
        metricName: 'user_login',
        condition: 'gt',
        threshold: 100,
        isActive: true,
        isTriggered: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAnalyticsService.createAlert.mockResolvedValue(expectedResponse);

      const result = await controller.createAlert(tenantId, alertData);

      expect(service.createAlert).toHaveBeenCalledWith(tenantId, alertData);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getAlerts', () => {
    const tenantId = 'tenant-123';

    it('should get all alerts for tenant', async () => {
      const expectedResponse = [
        {
          id: 'alert-123',
          tenantId,
          alertName: 'High Login Rate',
          severity: 'high',
          isActive: true,
          isTriggered: false,
        },
      ];

      mockAnalyticsService.getAlerts.mockResolvedValue(expectedResponse);

      const result = await controller.getAlerts(tenantId);

      expect(service.getAlerts).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getAlert', () => {
    const tenantId = 'tenant-123';
    const alertId = 'alert-123';

    it('should get specific alert successfully', async () => {
      const mockAlerts = [
        {
          id: 'alert-123',
          tenantId,
          alertName: 'High Login Rate',
          severity: 'high',
          isActive: true,
          isTriggered: false,
        },
      ];

      mockAnalyticsService.getAlerts.mockResolvedValue(mockAlerts);

      const result = await controller.getAlert(tenantId, alertId);

      expect(service.getAlerts).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(mockAlerts[0]);
    });

    it('should throw error when alert not found', async () => {
      mockAnalyticsService.getAlerts.mockResolvedValue([]);

      await expect(controller.getAlert(tenantId, alertId)).rejects.toThrow(
        'Alert not found'
      );
    });
  });

  describe('updateAlert', () => {
    const tenantId = 'tenant-123';
    const alertId = 'alert-123';
    const updateData: UpdateAlertDto = {
      alertName: 'Updated Alert Name',
      threshold: 150,
    };

    it('should update alert successfully', async () => {
      const expectedResponse = {
        id: 'alert-123',
        tenantId,
        alertName: 'Updated Alert Name',
        threshold: 150,
        isActive: true,
        isTriggered: false,
        updatedAt: new Date(),
      };

      mockAnalyticsService.updateAlert.mockResolvedValue(expectedResponse);

      const result = await controller.updateAlert(
        tenantId,
        alertId,
        updateData
      );

      expect(service.updateAlert).toHaveBeenCalledWith(
        tenantId,
        alertId,
        updateData
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('deleteAlert', () => {
    const tenantId = 'tenant-123';
    const alertId = 'alert-123';

    it('should delete alert successfully', async () => {
      mockAnalyticsService.deleteAlert.mockResolvedValue(undefined);

      await controller.deleteAlert(tenantId, alertId);

      expect(service.deleteAlert).toHaveBeenCalledWith(tenantId, alertId);
    });
  });

  describe('exportAnalytics', () => {
    const tenantId = 'tenant-123';
    const exportData: ExportAnalyticsDto = {
      format: 'json',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    it('should export analytics data successfully', async () => {
      const expectedResponse = {
        id: 'export-123',
        status: 'pending',
        format: 'json',
        createdAt: new Date(),
        recordCount: 0,
        fileSize: 0,
      };

      mockAnalyticsService.exportAnalytics.mockResolvedValue(expectedResponse);

      const result = await controller.exportAnalytics(tenantId, exportData);

      expect(service.exportAnalytics).toHaveBeenCalledWith(
        tenantId,
        exportData
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getExport', () => {
    const tenantId = 'tenant-123';
    const exportId = 'export-123';

    it('should get export details successfully', async () => {
      const expectedResponse = {
        id: 'export-123',
        status: 'completed',
        format: 'json',
        createdAt: new Date(),
        recordCount: 1000,
        fileSize: 1024 * 1024,
        downloadUrl: `https://api.example.com/exports/${exportId}/download`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        error: '',
      };

      mockAnalyticsService.getExport.mockResolvedValue(expectedResponse);

      const result = await controller.getExport(tenantId, exportId);

      expect(service.getExport).toHaveBeenCalledWith(tenantId, exportId);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getHealth', () => {
    const tenantId = 'tenant-123';

    it('should get system health status', async () => {
      const expectedResponse = {
        status: 'healthy',
        database: true,
        cache: true,
        queue: true,
        storage: true,
        activeAlerts: 0,
        storageUsed: 1024,
        lastUpdated: new Date(),
      };

      mockAnalyticsService.getHealth.mockResolvedValue(expectedResponse);

      const result = await controller.getHealth(tenantId);

      expect(service.getHealth).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getEventStats', () => {
    const tenantId = 'tenant-123';
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';

    it('should get event statistics', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          userId: 'user-1',
          eventType: AnalyticsEventType.USER_LOGIN,
        },
        {
          id: 'event-2',
          userId: 'user-2',
          eventType: AnalyticsEventType.USER_LOGIN,
        },
      ];

      mockAnalyticsService.getEvents.mockResolvedValue(mockEvents);

      const result = await controller.getEventStats(
        tenantId,
        startDate,
        endDate
      );

      expect(service.getEvents).toHaveBeenCalledWith(tenantId, {
        startDate,
        endDate,
      });
      expect(result).toMatchObject({
        totalEvents: 2,
        uniqueUsers: 2,
        eventTypes: expect.any(Object),
        period: { startDate, endDate },
      });
    });
  });

  describe('getUserStats', () => {
    const tenantId = 'tenant-123';
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';

    it('should get user activity statistics', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          userId: 'user-1',
          eventType: AnalyticsEventType.USER_LOGIN,
          timestamp: new Date(),
          user: { email: 'user1@example.com' },
        },
        {
          id: 'event-2',
          userId: 'user-2',
          eventType: AnalyticsEventType.USER_LOGIN,
          timestamp: new Date(),
          user: { email: 'user2@example.com' },
        },
      ];

      mockAnalyticsService.getEvents.mockResolvedValue(mockEvents);

      const result = await controller.getUserStats(
        tenantId,
        startDate,
        endDate
      );

      expect(service.getEvents).toHaveBeenCalledWith(tenantId, {
        startDate,
        endDate,
      });
      expect(result).toMatchObject({
        activeUsers: 2,
        totalUserEvents: 2,
        averageEventsPerUser: 1,
        userActivity: expect.any(Array),
        period: { startDate, endDate },
      });
    });
  });

  describe('getPerformanceStats', () => {
    const tenantId = 'tenant-123';

    it('should get performance statistics', async () => {
      const mockRealTimeMetrics = {
        activeUsers: 10,
        eventsPerMinute: 5,
        topEvents: [],
      };

      const mockHealth = {
        status: 'healthy',
        database: true,
        cache: true,
        queue: true,
        storage: true,
      };

      mockAnalyticsService.getRealTimeMetrics.mockResolvedValue(
        mockRealTimeMetrics
      );
      mockAnalyticsService.getHealth.mockResolvedValue(mockHealth);

      const result = await controller.getPerformanceStats(tenantId);

      expect(service.getRealTimeMetrics).toHaveBeenCalledWith(tenantId, {});
      expect(service.getHealth).toHaveBeenCalledWith(tenantId);
      expect(result).toMatchObject({
        realTime: mockRealTimeMetrics,
        systemHealth: mockHealth,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('getCustomMetric', () => {
    const tenantId = 'tenant-123';
    const metricName = 'custom_metric';
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';
    const groupBy = 'day';

    it('should get custom analytics metric', async () => {
      const mockAggregates = [
        {
          id: 'aggregate-1',
          metricName: 'custom_metric',
          totalValue: 100,
          count: 50,
        },
      ];

      mockAnalyticsService.getAggregates.mockResolvedValue(mockAggregates);

      const result = await controller.getCustomMetric(
        tenantId,
        metricName,
        startDate,
        endDate,
        groupBy
      );

      expect(service.getAggregates).toHaveBeenCalledWith(tenantId, {
        metricName,
        startDate,
        endDate,
      });
      expect(result).toMatchObject({
        metricName,
        data: mockAggregates,
        period: { startDate, endDate },
        groupBy,
      });
    });
  });

  describe('cleanupData', () => {
    const tenantId = 'tenant-123';
    const olderThan = '2024-01-01';

    it('should clean up old analytics data successfully', async () => {
      mockAnalyticsService.cleanupData.mockResolvedValue(undefined);

      await controller.cleanupData(tenantId, olderThan);

      expect(service.cleanupData).toHaveBeenCalledWith(tenantId, olderThan);
    });
  });
});
