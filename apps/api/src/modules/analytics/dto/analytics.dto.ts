import {
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsDateString,
  IsObject,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  AnalyticsEventType,
  AnalyticsMetricType,
} from '../entities/usage-analytics.entity';

// Event tracking DTOs
export class TrackEventDto {
  @IsEnum(AnalyticsEventType)
  eventType!: AnalyticsEventType;

  @IsString()
  @IsNotEmpty()
  eventName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AnalyticsMetricType)
  metricType?: AnalyticsMetricType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  metricValue?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export class TrackEventResponseDto {
  id!: string;
  eventType!: AnalyticsEventType;
  eventName!: string;
  timestamp!: Date;
  success!: boolean;
}

// Query DTOs
export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(AnalyticsEventType)
  eventType?: AnalyticsEventType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'timestamp';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class AnalyticsAggregateQueryDto {
  @IsOptional()
  @IsString()
  metricName?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 50;
}

// Response DTOs
export class AnalyticsEventResponseDto {
  id!: string;
  tenantId!: string;
  userId?: string;
  eventType!: AnalyticsEventType;
  eventName!: string;
  description!: string;
  metricType!: AnalyticsMetricType;
  metricValue!: number;
  metadata?: Record<string, any> | undefined;
  resourceId?: string | undefined;
  resourceType?: string | undefined;
  sessionId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  timestamp!: Date;
  createdAt!: Date;
  updatedAt!: Date;
  eventCategory!: string;
  user?:
    | {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      }
    | undefined;
}

export class AnalyticsAggregateResponseDto {
  id!: string;
  tenantId!: string;
  metricName!: string;
  period!: string;
  totalValue!: number;
  averageValue!: number;
  count!: number;
  minValue!: number;
  maxValue!: number;
  breakdown?: Record<string, any> | undefined;
  timestamp!: Date;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AnalyticsSummaryResponseDto {
  totalEvents!: number;
  uniqueUsers!: number;
  activeSessions!: number;
  topEvents!: Array<{
    eventType: AnalyticsEventType;
    eventName: string;
    count: number;
  }>;
  topUsers!: Array<{
    userId: string;
    email: string;
    eventCount: number;
  }>;
  periodBreakdown!: Array<{
    period: string;
    count: number;
    uniqueUsers: number;
  }>;
  categoryBreakdown!: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

export class AnalyticsDashboardResponseDto {
  summary!: AnalyticsSummaryResponseDto;
  recentEvents!: AnalyticsEventResponseDto[];
  aggregates!: AnalyticsAggregateResponseDto[];
  trends!: Array<{
    date: string;
    count: number;
    uniqueUsers: number;
  }>;
  topResources!: Array<{
    resourceType: string;
    resourceId: string;
    accessCount: number;
  }>;
}

// Report DTOs
export class GenerateReportDto {
  @IsString()
  reportType!:
    | 'usage'
    | 'user_activity'
    | 'feature_adoption'
    | 'performance'
    | 'custom';

  @IsOptional()
  @IsString()
  reportName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filters?: string[];

  @IsOptional()
  @IsString()
  format?: 'json' | 'csv' | 'pdf' | 'excel';

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class ReportResponseDto {
  id!: string;
  reportType!: string;
  reportName!: string;
  description?: string;
  status!: 'pending' | 'processing' | 'completed' | 'failed';
  format!: string;
  downloadUrl?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt!: Date;
  completedAt?: Date;
  error?: string;
  storageKey?: string;
}

// Alert DTOs
export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  alertName!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @IsString()
  @IsNotEmpty()
  metricName!: string;

  @IsEnum(['gt', 'lt', 'eq', 'gte', 'lte'])
  condition!: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';

  @Type(() => Number)
  @IsNumber()
  threshold!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateAlertDto {
  @IsOptional()
  @IsString()
  alertName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsString()
  metricName?: string;

  @IsOptional()
  @IsEnum(['gt', 'lt', 'eq', 'gte', 'lte'])
  condition?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  threshold?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AlertResponseDto {
  id!: string;
  tenantId!: string;
  alertName!: string;
  description!: string;
  severity!: 'low' | 'medium' | 'high' | 'critical';
  metricName!: string;
  condition!: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold!: number;
  isActive!: boolean;
  isTriggered!: boolean;
  lastTriggeredAt?: Date | undefined;
  metadata?: Record<string, any> | undefined;
  createdAt!: Date;
  updatedAt!: Date;
}

// Export DTOs
export class ExportAnalyticsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(AnalyticsEventType, { each: true })
  eventTypes?: AnalyticsEventType[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @IsOptional()
  @IsString()
  format?: 'json' | 'csv' | 'excel';

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeMetadata?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeUserInfo?: boolean = false;
}

export class ExportResponseDto {
  id!: string;
  status!: 'pending' | 'processing' | 'completed' | 'failed';
  format!: string;
  downloadUrl?: string;
  expiresAt?: Date;
  recordCount?: number;
  fileSize?: number;
  createdAt!: Date;
  completedAt?: Date;
  error?: string;
}

// Real-time tracking DTOs
export class RealTimeMetricsDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class RealTimeMetricsResponseDto {
  activeUsers!: number;
  activeSessions!: number;
  eventsPerMinute!: number;
  topEvents!: Array<{
    eventType: AnalyticsEventType;
    count: number;
  }>;
  systemHealth!: {
    cpu: number;
    memory: number;
    responseTime: number;
  };
  lastUpdated!: Date;
}

// Bulk operations DTOs
export class BulkTrackEventsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  events!: TrackEventDto[];
}

export class BulkTrackEventsResponseDto {
  successCount!: number;
  failureCount!: number;
  errors!: Array<{
    index: number;
    error: string;
  }>;
  eventIds!: string[];
}

// Health check DTOs
export class AnalyticsHealthResponseDto {
  status!: 'healthy' | 'degraded' | 'unhealthy';
  checks!: {
    database: boolean;
    cache: boolean;
    queue: boolean;
    storage: boolean;
  };
  metrics!: {
    totalEvents: number;
    eventsToday: number;
    activeAlerts: number;
    storageUsed: number;
  };
  lastUpdated!: Date;
}
