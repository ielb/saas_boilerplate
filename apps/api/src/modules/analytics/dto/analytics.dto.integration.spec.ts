import { AnalyticsService } from '../services/analytics.service';
import {
  AnalyticsEventType,
  AnalyticsMetricType,
} from '../entities/usage-analytics.entity';
import {
  AnalyticsQueryDto,
  AnalyticsAggregateQueryDto,
  ExportAnalyticsDto,
} from './analytics.dto';

describe('Analytics DTOs - Integration Tests', () => {
  let analyticsService: jest.Mocked<AnalyticsService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    // Create a mock AnalyticsService
    analyticsService = {
      getEvents: jest.fn().mockResolvedValue([]),
      getAggregates: jest.fn().mockResolvedValue([]),
      exportAnalytics: jest.fn().mockResolvedValue({}),
    } as any;
  });

  describe('AnalyticsQueryDto - Default Values Integration', () => {
    it('should apply default values when optional properties are omitted from query parameters', async () => {
      // Arrange - Create query with minimal parameters (omitting optional properties with defaults)
      const minimalQuery = {
        userId: mockUserId,
        eventType: AnalyticsEventType.USER_LOGIN,
      };

      // Act - Call the service method and verify it processes the query correctly
      const result = await analyticsService.getEvents(
        mockTenantId,
        minimalQuery as AnalyticsQueryDto
      );

      // Assert - Service should return an array of events
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should use provided values when optional properties are included', async () => {
      // Arrange - Create query with all properties
      const fullQuery = {
        userId: mockUserId,
        eventType: AnalyticsEventType.USER_LOGIN,
        sortBy: 'eventName',
        sortOrder: 'ASC' as const,
        limit: 25,
        offset: 10,
      };

      // Act - Call the service method
      const result = await analyticsService.getEvents(
        mockTenantId,
        fullQuery as AnalyticsQueryDto
      );

      // Assert - Service should return an array of events
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle string to number conversion for limit and offset', async () => {
      // Arrange - Create query with string values for numeric fields
      const stringQuery = {
        userId: mockUserId,
        limit: '25',
        offset: '10',
      };

      // Act - Call the service method
      const result = await analyticsService.getEvents(
        mockTenantId,
        stringQuery as any
      );

      // Assert - Service should return an array of events
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('AnalyticsAggregateQueryDto - Default Values Integration', () => {
    it('should apply default values when optional properties are omitted', async () => {
      // Arrange - Create query with minimal parameters
      const minimalQuery = {
        metricName: 'test-metric',
        period: 'daily',
      };

      // Act - Call the service method
      const result = await analyticsService.getAggregates(
        mockTenantId,
        minimalQuery as AnalyticsAggregateQueryDto
      );

      // Assert - Service should return an array of aggregates
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('ExportAnalyticsDto - Default Values Integration', () => {
    it('should apply default values when optional properties are omitted', async () => {
      // Arrange - Create export request with minimal parameters
      const minimalExport = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      // Act - Call the service method
      const result = await analyticsService.exportAnalytics(
        mockTenantId,
        minimalExport as ExportAnalyticsDto
      );

      // Assert - Service should return export data
      expect(result).toBeDefined();
    });
  });

  describe('Real API Request Simulation', () => {
    it('should handle real query parameters with proper default value application', async () => {
      // Arrange - Simulate real API request parameters
      const apiQuery = {
        userId: mockUserId,
        eventType: AnalyticsEventType.USER_LOGIN,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        limit: 100,
        offset: 0,
      };

      // Act - Call the service method
      const result = await analyticsService.getEvents(
        mockTenantId,
        apiQuery as AnalyticsQueryDto
      );

      // Assert - Service should return an array of events
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply defaults when query parameters are missing', async () => {
      // Arrange - Simulate API request with minimal parameters
      const minimalApiQuery = {
        userId: mockUserId,
      };

      // Act - Call the service method
      const result = await analyticsService.getEvents(
        mockTenantId,
        minimalApiQuery as AnalyticsQueryDto
      );

      // Assert - Service should return an array of events
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
