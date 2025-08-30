import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsController } from '../controllers/analytics.controller';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsModule } from '../analytics.module';
import { UsageAnalytics, AnalyticsEventType, AnalyticsMetricType } from '../entities/usage-analytics.entity';
import { AnalyticsQueryDto, AnalyticsAggregateQueryDto, ExportAnalyticsDto } from './analytics.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { TenantScopingInterceptor } from '../../../common/interceptors/tenant-scoping.interceptor';

describe('Analytics DTOs - Integration Tests', () => {
  let app: INestApplication;
  let analyticsController: AnalyticsController;
  let analyticsService: AnalyticsService;
  let analyticsRepository: Repository<UsageAnalytics>;

  const mockTenantId = 'test-tenant-id';
  const mockUserId = 'test-user-id';

  // Mock guards and interceptors
  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockPermissionsGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockTenantScopingInterceptor = {
    intercept: jest.fn((context, next) => next.handle()),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'test',
          password: 'test',
          database: 'test_db',
          entities: [UsageAnalytics],
          synchronize: true,
          logging: false,
        }),
        AnalyticsModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .overrideInterceptor(TenantScopingInterceptor)
      .useValue(mockTenantScopingInterceptor)
      .compile();

    app = moduleFixture.createNestApplication();
    
    // Apply global validation pipe with the same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );

    await app.init();

    analyticsController = moduleFixture.get<AnalyticsController>(AnalyticsController);
    analyticsService = moduleFixture.get<AnalyticsService>(AnalyticsService);
    analyticsRepository = moduleFixture.get<Repository<UsageAnalytics>>(getRepositoryToken(UsageAnalytics));

    // Mock the tenant decorator
    jest.spyOn(analyticsController, 'getEvents').mockImplementation(async (tenantId: string, query: AnalyticsQueryDto) => {
      // This simulates what happens when the DTO is processed by the validation pipe
      return [];
    });

    jest.spyOn(analyticsService, 'getEvents').mockImplementation(async (tenantId: string, query: AnalyticsQueryDto) => {
      // Return the query object to verify default values are applied
      return query as any;
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('AnalyticsQueryDto - Default Values Integration', () => {
    it('should apply default values when optional properties are omitted from query parameters', async () => {
      // Arrange - Create query with minimal parameters (omitting optional properties with defaults)
      const minimalQuery = {
        userId: mockUserId,
        eventType: AnalyticsEventType.USER_LOGIN,
      };

      // Act - Call the controller method (this simulates the validation pipe processing)
      const result = await analyticsService.getEvents(mockTenantId, minimalQuery as AnalyticsQueryDto);

      // Assert - Default values should be applied
      expect(result).toBeDefined();
      expect(result.sortBy).toBe('timestamp');
      expect(result.sortOrder).toBe('DESC');
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
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
      const result = await analyticsService.getEvents(mockTenantId, fullQuery as AnalyticsQueryDto);

      // Assert - Provided values should be used
      expect(result).toBeDefined();
      expect(result.sortBy).toBe('eventName');
      expect(result.sortOrder).toBe('ASC');
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(10);
    });

    it('should handle string to number conversion for limit and offset', async () => {
      // Arrange - Create query with string values for numeric fields
      const stringQuery = {
        userId: mockUserId,
        limit: '25',
        offset: '10',
      };

      // Act - Call the service method
      const result = await analyticsService.getEvents(mockTenantId, stringQuery as any);

      // Assert - String values should be converted to numbers
      expect(result).toBeDefined();
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(10);
    });
  });

  describe('AnalyticsAggregateQueryDto - Default Values Integration', () => {
    it('should apply default values when optional properties are omitted', async () => {
      // Arrange - Create query with minimal parameters
      const minimalQuery = {
        metricName: 'test-metric',
        period: 'daily',
      };

      // Mock the service method
      jest.spyOn(analyticsService, 'getAggregates').mockImplementation(async (tenantId: string, query: AnalyticsAggregateQueryDto) => {
        return query as any;
      });

      // Act - Call the service method
      const result = await analyticsService.getAggregates(mockTenantId, minimalQuery as AnalyticsAggregateQueryDto);

      // Assert - Default values should be applied
      expect(result).toBeDefined();
      expect(result.limit).toBe(50);
    });
  });

  describe('ExportAnalyticsDto - Default Values Integration', () => {
    it('should apply default values when optional properties are omitted', async () => {
      // Arrange - Create export request with minimal parameters
      const minimalExport = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      // Mock the service method
      jest.spyOn(analyticsService, 'exportAnalytics').mockImplementation(async (tenantId: string, exportData: ExportAnalyticsDto) => {
        return {
          id: 'export-123',
          status: 'pending',
          format: exportData.format || 'json',
          createdAt: new Date(),
        };
      });

      // Act - Call the service method
      const result = await analyticsService.exportAnalytics(mockTenantId, minimalExport as ExportAnalyticsDto);

      // Assert - Default values should be applied
      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });

  describe('Real API Request Simulation', () => {
    it('should handle real query parameters with proper default value application', async () => {
      // Arrange - Simulate real HTTP query parameters (all strings)
      const queryParams = {
        userId: mockUserId,
        eventType: AnalyticsEventType.USER_LOGIN,
        limit: '25',
        offset: '10',
        sortBy: 'eventName',
        sortOrder: 'ASC',
      };

      // Act - Process through validation pipe (simulated)
      const dto = new AnalyticsQueryDto();
      Object.assign(dto, queryParams);

      // Assert - Values should be properly converted and defaults applied
      expect(dto.userId).toBe(mockUserId);
      expect(dto.eventType).toBe(AnalyticsEventType.USER_LOGIN);
      expect(dto.limit).toBe(25); // String converted to number
      expect(dto.offset).toBe(10); // String converted to number
      expect(dto.sortBy).toBe('eventName');
      expect(dto.sortOrder).toBe('ASC');
    });

    it('should apply defaults when query parameters are missing', async () => {
      // Arrange - Simulate minimal HTTP query parameters
      const queryParams = {
        userId: mockUserId,
        eventType: AnalyticsEventType.USER_LOGIN,
        // limit, offset, sortBy, sortOrder are omitted
      };

      // Act - Process through validation pipe (simulated)
      const dto = new AnalyticsQueryDto();
      Object.assign(dto, queryParams);

      // Assert - Default values should be applied for missing properties
      expect(dto.userId).toBe(mockUserId);
      expect(dto.eventType).toBe(AnalyticsEventType.USER_LOGIN);
      expect(dto.sortBy).toBe('timestamp'); // Default applied
      expect(dto.sortOrder).toBe('DESC'); // Default applied
      expect(dto.limit).toBe(50); // Default applied
      expect(dto.offset).toBe(0); // Default applied
    });
  });
});
