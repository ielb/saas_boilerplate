import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AnalyticsQueryDto,
  AnalyticsAggregateQueryDto,
  ExportAnalyticsDto,
  TrackEventDto,
} from './analytics.dto';
import {
  AnalyticsEventType,
  AnalyticsMetricType,
} from '../entities/usage-analytics.entity';

describe('Analytics DTOs - Default Values', () => {
  describe('AnalyticsQueryDto', () => {
    it('should apply default values when optional properties are omitted', async () => {
      // Arrange - Create DTO with minimal data (omitting optional properties with defaults)
      const plainData = {
        userId: 'test-user-id',
        eventType: AnalyticsEventType.USER_LOGIN,
      };

      // Act - Transform and validate
      const dto = plainToClass(AnalyticsQueryDto, plainData);
      const errors = await validate(dto);

      // Assert - Default values should be applied
      expect(errors).toHaveLength(0);
      expect(dto.sortBy).toBe('timestamp');
      expect(dto.sortOrder).toBe('DESC');
      expect(dto.limit).toBe(50);
      expect(dto.offset).toBe(0);
    });

    it('should use provided values when optional properties are included', async () => {
      // Arrange - Create DTO with all properties
      const plainData = {
        userId: 'test-user-id',
        eventType: AnalyticsEventType.USER_LOGIN,
        sortBy: 'eventName',
        sortOrder: 'ASC' as const,
        limit: 25,
        offset: 10,
      };

      // Act - Transform and validate
      const dto = plainToClass(AnalyticsQueryDto, plainData);
      const errors = await validate(dto);

      // Assert - Provided values should be used
      expect(errors).toHaveLength(0);
      expect(dto.sortBy).toBe('eventName');
      expect(dto.sortOrder).toBe('ASC');
      expect(dto.limit).toBe(25);
      expect(dto.offset).toBe(10);
    });

    it('should handle string to number conversion for limit and offset', async () => {
      // Arrange - Create DTO with string values for numeric fields
      const plainData = {
        userId: 'test-user-id',
        limit: '25',
        offset: '10',
      };

      // Act - Transform and validate
      const dto = plainToClass(AnalyticsQueryDto, plainData);
      const errors = await validate(dto);

      // Assert - String values should be converted to numbers
      expect(errors).toHaveLength(0);
      expect(dto.limit).toBe(25);
      expect(dto.offset).toBe(10);
    });
  });

  describe('AnalyticsAggregateQueryDto', () => {
    it('should apply default values when optional properties are omitted', async () => {
      // Arrange - Create DTO with minimal data
      const plainData = {
        metricName: 'test-metric',
        period: 'daily',
      };

      // Act - Transform and validate
      const dto = plainToClass(AnalyticsAggregateQueryDto, plainData);
      const errors = await validate(dto);

      // Assert - Default values should be applied
      expect(errors).toHaveLength(0);
      expect(dto.limit).toBe(50);
    });

    it('should handle string to number conversion for limit', async () => {
      // Arrange - Create DTO with string value for limit
      const plainData = {
        metricName: 'test-metric',
        limit: '25',
      };

      // Act - Transform and validate
      const dto = plainToClass(AnalyticsAggregateQueryDto, plainData);
      const errors = await validate(dto);

      // Assert - String value should be converted to number
      expect(errors).toHaveLength(0);
      expect(dto.limit).toBe(25);
    });
  });

  describe('ExportAnalyticsDto', () => {
    it('should apply default values when optional properties are omitted', async () => {
      // Arrange - Create DTO with minimal data
      const plainData = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      // Act - Transform and validate
      const dto = plainToClass(ExportAnalyticsDto, plainData);
      const errors = await validate(dto);

      // Assert - Default values should be applied
      expect(errors).toHaveLength(0);
      expect(dto.includeMetadata).toBe(true);
      expect(dto.includeUserInfo).toBe(false);
    });

    it('should handle string to boolean conversion', async () => {
      // Arrange - Create DTO with string values for boolean fields
      const plainData = {
        includeMetadata: 'false',
        includeUserInfo: 'true',
      };

      // Act - Transform and validate
      const dto = plainToClass(ExportAnalyticsDto, plainData);
      const errors = await validate(dto);

      // Assert - String values should be converted to booleans
      expect(errors).toHaveLength(0);
      expect(dto.includeMetadata).toBe(false);
      expect(dto.includeUserInfo).toBe(true);
    });
  });

  describe('TrackEventDto', () => {
    it('should handle string to number conversion for metricValue', async () => {
      // Arrange - Create DTO with string value for metricValue
      const plainData = {
        eventType: AnalyticsEventType.USER_LOGIN,
        eventName: 'test-event',
        metricValue: '42',
        metricType: AnalyticsMetricType.COUNT,
      };

      // Act - Transform and validate
      const dto = plainToClass(TrackEventDto, plainData);
      const errors = await validate(dto);

      // Assert - String value should be converted to number
      expect(errors).toHaveLength(0);
      expect(dto.metricValue).toBe(42);
    });
  });
});
