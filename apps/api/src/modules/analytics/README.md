# Analytics Module

The Analytics Module provides comprehensive tenant usage analytics and reporting capabilities for the SaaS Boilerplate platform. It enables tracking of user activities, generating insights, creating alerts, and producing detailed reports.

## 🎯 Features

### Core Analytics

- **Event Tracking**: Track user activities and system events
- **Real-time Metrics**: Monitor active users, sessions, and system health
- **Data Aggregation**: Automatic aggregation of analytics data by hour, day, week, and month
- **Dashboard**: Comprehensive analytics dashboard with key metrics
- **Custom Metrics**: Support for custom analytics queries

### Reporting & Export

- **Report Generation**: Create detailed analytics reports in multiple formats
- **Data Export**: Export analytics data in JSON, CSV, and Excel formats
- **Scheduled Reports**: Automated report generation and delivery
- **Custom Queries**: Flexible querying with filtering and grouping options

### Alerting System

- **Threshold Alerts**: Set up alerts based on metric thresholds
- **Multi-severity Levels**: Low, medium, high, and critical alert levels
- **Email Notifications**: Automatic email notifications for triggered alerts
- **Alert Management**: Create, update, and manage analytics alerts

### Performance Monitoring

- **System Health**: Monitor database, cache, queue, and storage health
- **Performance Metrics**: Track response times, CPU, and memory usage
- **Real-time Monitoring**: Live system performance monitoring
- **Health Checks**: Comprehensive system health status

## 📊 Data Model

### UsageAnalytics Entity

Tracks individual analytics events with comprehensive metadata:

```typescript
{
  id: string;
  tenantId: string;
  userId?: string;
  eventType: AnalyticsEventType;
  eventName: string;
  description?: string;
  metricType: AnalyticsMetricType;
  metricValue: number;
  metadata?: Record<string, any>;
  resourceId?: string;
  resourceType?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}
```

### AnalyticsAggregate Entity

Stores pre-aggregated analytics data for performance:

```typescript
{
  id: string;
  tenantId: string;
  metricName: string;
  period: string; // 'hour', 'day', 'week', 'month'
  totalValue: number;
  averageValue: number;
  count: number;
  minValue: number;
  maxValue: number;
  breakdown?: Record<string, any>;
  timestamp: Date;
}
```

### AnalyticsAlert Entity

Manages analytics alerts and notifications:

```typescript
{
  id: string;
  tenantId: string;
  alertName: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metricName: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  isActive: boolean;
  isTriggered: boolean;
  lastTriggeredAt?: Date;
  metadata?: Record<string, any>;
}
```

## 🚀 API Endpoints

### Event Tracking

- `POST /analytics/events/track` - Track a single analytics event
- `POST /analytics/events/track/bulk` - Track multiple events in bulk

### Data Querying

- `GET /analytics/events` - Get analytics events with filtering
- `GET /analytics/aggregates` - Get aggregated analytics data
- `GET /analytics/dashboard` - Get comprehensive dashboard data
- `GET /analytics/summary` - Get analytics summary with key metrics

### Real-time Analytics

- `GET /analytics/realtime` - Get real-time analytics metrics
- `GET /analytics/health` - Get analytics system health status

### Alert Management

- `POST /analytics/alerts` - Create analytics alert
- `GET /analytics/alerts` - Get all analytics alerts
- `GET /analytics/alerts/:id` - Get specific analytics alert
- `PUT /analytics/alerts/:id` - Update analytics alert
- `DELETE /analytics/alerts/:id` - Delete analytics alert

### Reporting & Export

- `POST /analytics/reports` - Generate analytics report
- `GET /analytics/reports/:id` - Get report status and details
- `POST /analytics/export` - Export analytics data
- `GET /analytics/export/:id` - Get export job status

### Statistics

- `GET /analytics/stats/events` - Get event statistics
- `GET /analytics/stats/users` - Get user activity statistics
- `GET /analytics/stats/performance` - Get performance statistics
- `GET /analytics/custom/:metricName` - Get custom analytics metric

## 📈 Event Types

The analytics module supports tracking various event types:

### Authentication Events

- `user_login` - User login events
- `user_logout` - User logout events

### Feature Usage

- `feature_access` - Feature access events
- `api_call` - API call tracking

### File Operations

- `file_upload` - File upload events
- `file_download` - File download events

### Team Management

- `team_created` - Team creation events
- `team_joined` - Team joining events

### Delegation System

- `delegation_created` - Delegation creation events
- `delegation_activated` - Delegation activation events

### Invitation System

- `invitation_sent` - Invitation sent events
- `invitation_accepted` - Invitation acceptance events

### Bulk Operations

- `bulk_import` - Bulk import events
- `bulk_export` - Bulk export events

### Billing & Payments

- `payment_processed` - Payment processing events
- `subscription_changed` - Subscription change events

### Custom Events

- `custom_event` - Custom analytics events

## 🔧 Configuration

### Environment Variables

```bash
# Analytics Configuration
ANALYTICS_ENABLED=true
ANALYTICS_RETENTION_DAYS=90
ANALYTICS_BATCH_SIZE=1000
ANALYTICS_AGGREGATION_ENABLED=true

# Alert Configuration
ANALYTICS_ALERT_EMAIL_ENABLED=true
ANALYTICS_ALERT_EMAIL_FROM=alerts@example.com
ANALYTICS_ALERT_EMAIL_TO=admin@example.com

# Performance Configuration
ANALYTICS_CACHE_TTL=300
ANALYTICS_QUERY_TIMEOUT=30000
```

### Module Configuration

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsageAnalytics,
      AnalyticsAggregate,
      AnalyticsAlert,
    ]),
    EventEmitterModule,
    ScheduleModule.forRoot(),
    EmailModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
```

## 📋 Usage Examples

### Tracking User Login Event

```typescript
const eventData = {
  eventType: AnalyticsEventType.USER_LOGIN,
  eventName: 'User Login',
  description: 'User logged in successfully',
  metricType: AnalyticsMetricType.COUNT,
  metricValue: 1,
  metadata: {
    browser: 'Chrome',
    os: 'Windows',
    ip: '192.168.1.1',
  },
  sessionId: 'session-123',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
};

const result = await analyticsService.trackEvent(tenantId, userId, eventData);
```

### Creating Analytics Alert

```typescript
const alertData = {
  alertName: 'High Login Rate',
  description: 'Alert when login rate exceeds threshold',
  severity: 'high',
  metricName: 'user_login',
  condition: 'gt',
  threshold: 100,
  isActive: true,
  metadata: {
    notificationEmail: 'admin@example.com',
  },
};

const alert = await analyticsService.createAlert(tenantId, alertData);
```

### Getting Dashboard Data

```typescript
const dashboard = await analyticsService.getDashboard(tenantId, 'day');

console.log('Total Events:', dashboard.summary.totalEvents);
console.log('Unique Users:', dashboard.summary.uniqueUsers);
console.log('Active Sessions:', dashboard.summary.activeSessions);
```

### Generating Report

```typescript
const reportData = {
  reportType: 'usage',
  reportName: 'Monthly Usage Report',
  description: 'Comprehensive usage analytics report',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  format: 'pdf',
  metrics: ['user_activity', 'feature_usage', 'performance'],
  filters: ['active_users_only'],
};

const report = await analyticsService.generateReport(tenantId, reportData);
```

## 🔄 Cron Jobs

The analytics module includes automated cron jobs for data aggregation:

- **Hourly Aggregation**: Runs every hour to aggregate analytics data
- **Daily Aggregation**: Runs daily at midnight for daily summaries
- **Weekly Aggregation**: Runs weekly for weekly analytics
- **Monthly Aggregation**: Runs monthly for monthly reports

## 🛡️ Security & Permissions

### Required Permissions

- `ANALYTICS:CREATE` - Create analytics events and alerts
- `ANALYTICS:READ` - Read analytics data and reports
- `ANALYTICS:UPDATE` - Update analytics alerts
- `ANALYTICS:DELETE` - Delete analytics alerts and data

### Tenant Isolation

All analytics data is automatically scoped to the tenant context, ensuring complete data isolation between tenants.

## 📊 Performance Considerations

### Database Optimization

- Comprehensive indexing on frequently queried fields
- Partitioned tables for large datasets
- Optimized queries with proper joins and filtering

### Caching Strategy

- Redis caching for frequently accessed metrics
- Aggregated data caching to reduce query load
- Real-time metrics caching for dashboard performance

### Data Retention

- Configurable data retention policies
- Automatic cleanup of old analytics data
- Archive strategies for historical data

## 🧪 Testing

### Unit Tests

```bash
# Run analytics service tests
yarn test src/modules/analytics/services/analytics.service.spec.ts

# Run with coverage
yarn test:cov src/modules/analytics/
```

### Integration Tests

```bash
# Run analytics integration tests
yarn test:e2e src/modules/analytics/
```

### Postman Collection

The analytics module includes comprehensive Postman tests covering all endpoints with proper authentication and validation.

## 🔍 Monitoring & Debugging

### Logging

The analytics module provides detailed logging for:

- Event tracking operations
- Alert triggering and notifications
- Data aggregation processes
- Error handling and recovery

### Metrics

Key metrics to monitor:

- Event tracking throughput
- Query response times
- Alert processing performance
- Data aggregation completion rates

### Health Checks

The `/analytics/health` endpoint provides:

- Database connectivity status
- Cache health status
- Queue processing status
- Storage availability status

## 🚀 Deployment

### Database Migration

```bash
# Run analytics migration
yarn migration:run

# Verify migration
yarn migration:show
```

### Environment Setup

1. Ensure PostgreSQL database is configured
2. Configure Redis for caching and event processing
3. Set up email service for alert notifications
4. Configure environment variables

### Scaling Considerations

- Horizontal scaling with load balancers
- Database read replicas for analytics queries
- Redis clustering for high availability
- Queue processing for background tasks

## 📚 Additional Resources

- [Analytics API Documentation](./api-docs.md)
- [Analytics Dashboard Guide](./dashboard-guide.md)
- [Alert Configuration Guide](./alerts-guide.md)
- [Report Generation Guide](./reports-guide.md)
- [Performance Tuning Guide](./performance-guide.md)
