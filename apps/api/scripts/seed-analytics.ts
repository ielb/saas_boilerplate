#!/usr/bin/env ts-node

/**
 * Analytics Data Seeding Script
 *
 * This script will:
 * 1. Add comprehensive analytics events for existing tenants
 * 2. Create analytics aggregates for different time periods
 * 3. Generate analytics alerts for monitoring
 * 4. Create analytics reports for testing
 * 5. Add real-time metrics data
 *
 * Usage:
 * cd apps/api && npx ts-node scripts/seed-analytics.ts
 */

import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

// Import analytics entities
import {
  UsageAnalytics,
  AnalyticsAggregate,
  AnalyticsAlert,
  AnalyticsReport,
  AnalyticsEventType,
  AnalyticsMetricType,
} from '../src/modules/analytics/entities/usage-analytics.entity';

// Import user and tenant entities
import { User } from '../src/modules/users/entities/user.entity';
import { Tenant } from '../src/modules/tenants/entities/tenant.entity';
import { UserTenantMembership } from '../src/modules/tenants/entities/user-tenant-membership.entity';
import { Role } from '../src/modules/rbac/entities/role.entity';
import { Permission } from '../src/modules/rbac/entities/permission.entity';

// Database configuration
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'saas_user',
  password: process.env.DB_PASSWORD || 'saas_password',
  database: process.env.DB_DATABASE || 'saas_boilerplate',
  entities: [
    UsageAnalytics,
    AnalyticsAggregate,
    AnalyticsAlert,
    AnalyticsReport,
    User,
    Tenant,
    UserTenantMembership,
    Role,
    Permission,
  ],
  synchronize: false,
  logging: false,
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message: string, color: keyof typeof colors = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message: string) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(message, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logStep(message: string) {
  log(`\n📋 ${message}`, 'yellow');
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

// Test data configuration
const TENANTS = [
  {
    id: 'd0753700-a1d9-4c23-9237-5101fa2eaac2',
    name: 'System',
  },
  {
    id: '42e3fcf3-2752-49c0-8244-f64bbdba2b6c',
    name: 'Acmac',
  },
];

const EVENT_TYPES = [
  AnalyticsEventType.USER_LOGIN,
  AnalyticsEventType.USER_LOGOUT,
  AnalyticsEventType.FEATURE_ACCESS,
  AnalyticsEventType.API_CALL,
  AnalyticsEventType.FILE_UPLOAD,
  AnalyticsEventType.FILE_DOWNLOAD,
  AnalyticsEventType.TEAM_CREATED,
  AnalyticsEventType.TEAM_JOINED,
  AnalyticsEventType.DELEGATION_CREATED,
  AnalyticsEventType.DELEGATION_ACTIVATED,
  AnalyticsEventType.INVITATION_SENT,
  AnalyticsEventType.INVITATION_ACCEPTED,
  AnalyticsEventType.BULK_IMPORT,
  AnalyticsEventType.BULK_EXPORT,
  AnalyticsEventType.PAYMENT_PROCESSED,
  AnalyticsEventType.SUBSCRIPTION_CHANGED,
  AnalyticsEventType.CUSTOM_EVENT,
];

const EVENT_NAMES = {
  [AnalyticsEventType.USER_LOGIN]: 'User Login',
  [AnalyticsEventType.USER_LOGOUT]: 'User Logout',
  [AnalyticsEventType.FEATURE_ACCESS]: 'Feature Access',
  [AnalyticsEventType.API_CALL]: 'API Call',
  [AnalyticsEventType.FILE_UPLOAD]: 'File Upload',
  [AnalyticsEventType.FILE_DOWNLOAD]: 'File Download',
  [AnalyticsEventType.TEAM_CREATED]: 'Team Created',
  [AnalyticsEventType.TEAM_JOINED]: 'Team Joined',
  [AnalyticsEventType.DELEGATION_CREATED]: 'Delegation Created',
  [AnalyticsEventType.DELEGATION_ACTIVATED]: 'Delegation Activated',
  [AnalyticsEventType.INVITATION_SENT]: 'Invitation Sent',
  [AnalyticsEventType.INVITATION_ACCEPTED]: 'Invitation Accepted',
  [AnalyticsEventType.BULK_IMPORT]: 'Bulk Import',
  [AnalyticsEventType.BULK_EXPORT]: 'Bulk Export',
  [AnalyticsEventType.PAYMENT_PROCESSED]: 'Payment Processed',
  [AnalyticsEventType.SUBSCRIPTION_CHANGED]: 'Subscription Changed',
  [AnalyticsEventType.CUSTOM_EVENT]: 'Custom Event',
};

class AnalyticsSeeder {
  private analyticsRepository: any;
  private aggregateRepository: any;
  private alertRepository: any;
  private reportRepository: any;
  private userRepository: any;
  private tenantRepository: any;

  async initialize() {
    logHeader('🚀 INITIALIZING ANALYTICS SEEDER');

    try {
      await dataSource.initialize();
      logSuccess('Database connection established');

      // Initialize repositories
      this.analyticsRepository = dataSource.getRepository(UsageAnalytics);
      this.aggregateRepository = dataSource.getRepository(AnalyticsAggregate);
      this.alertRepository = dataSource.getRepository(AnalyticsAlert);
      this.reportRepository = dataSource.getRepository(AnalyticsReport);
      this.userRepository = dataSource.getRepository(User);
      this.tenantRepository = dataSource.getRepository(Tenant);

      logSuccess('Repositories initialized');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError(`Failed to initialize database: ${errorMessage}`);
      throw error;
    }
  }

  async seed() {
    logHeader('🌱 STARTING ANALYTICS SEEDING PROCESS');

    try {
      // Get existing tenants and users
      const tenants = await this.tenantRepository.find();
      const users = await this.userRepository.find();

      if (tenants.length === 0) {
        logError('No tenants found. Please run the main seeding script first.');
        return;
      }

      if (users.length === 0) {
        logError('No users found. Please run the main seeding script first.');
        return;
      }

      logSuccess(`Found ${tenants.length} tenants and ${users.length} users`);

      // Seed analytics data for each tenant
      for (const tenant of tenants) {
        await this.seedTenantAnalytics(tenant, users);
      }

      logSuccess('Analytics seeding completed successfully!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError(`Seeding failed: ${errorMessage}`);
      throw error;
    }
  }

  private async seedTenantAnalytics(tenant: any, users: any[]) {
    logStep(`Seeding analytics data for tenant: ${tenant.name}`);

    // Filter users for this tenant (simplified - in real app you'd check memberships)
    const tenantUsers = users.filter(
      user =>
        user.email.includes('admin') ||
        user.email.includes('manager') ||
        user.email.includes('member') ||
        user.email.includes('viewer')
    );

    // Generate events for the last 30 days
    await this.generateAnalyticsEvents(tenant, tenantUsers);

    // Generate aggregates
    await this.generateAnalyticsAggregates(tenant);

    // Generate alerts
    await this.generateAnalyticsAlerts(tenant);

    // Generate reports
    await this.generateAnalyticsReports(tenant);

    logSuccess(`Completed seeding for tenant: ${tenant.name}`);
  }

  private async generateAnalyticsEvents(tenant: any, users: any[]) {
    logStep(`Generating analytics events for ${tenant.name}`);

    const events = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Generate events for each day in the last 30 days
    for (let day = 0; day < 30; day++) {
      const currentDate = new Date(
        thirtyDaysAgo.getTime() + day * 24 * 60 * 60 * 1000
      );

      // Generate 10-50 events per day
      const eventsPerDay = Math.floor(Math.random() * 41) + 10;

      for (let i = 0; i < eventsPerDay; i++) {
        const eventType =
          EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        const timestamp = new Date(
          currentDate.getTime() + Math.random() * 24 * 60 * 60 * 1000
        );
        const eventName =
          EVENT_NAMES[eventType as keyof typeof EVENT_NAMES] || 'Custom Event';

        const event = this.analyticsRepository.create({
          id: uuidv4(),
          tenantId: tenant.id,
          userId: user?.id || null,
          eventType,
          eventName,
          description: `Test event: ${eventName}`,
          metricType: AnalyticsMetricType.COUNT,
          metricValue: Math.floor(Math.random() * 100) + 1,
          metadata: {
            source: 'seeding-script',
            test: true,
            day: day,
            eventIndex: i,
          },
          resourceId: `resource-${Math.floor(Math.random() * 1000)}`,
          resourceType: 'test-resource',
          sessionId: `session-${Math.floor(Math.random() * 10000)}`,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Test Browser) Analytics Seeder/1.0',
          timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        events.push(event);
      }
    }

    // Save events in batches
    const batchSize = 100;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      await this.analyticsRepository.save(batch);
    }

    logSuccess(
      `Generated ${events.length} analytics events for ${tenant.name}`
    );
  }

  private async generateAnalyticsAggregates(tenant: any) {
    logStep(`Generating analytics aggregates for ${tenant.name}`);

    const aggregates = [];
    const now = new Date();
    const periods = ['hour', 'day', 'week', 'month'];

    // Generate aggregates for different periods
    for (const period of periods) {
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

        const aggregate = this.aggregateRepository.create({
          id: uuidv4(),
          tenantId: tenant.id,
          metricName: `test_metric_${period}`,
          period,
          totalValue: Math.floor(Math.random() * 10000) + 1000,
          averageValue: Math.floor(Math.random() * 100) + 10,
          count: Math.floor(Math.random() * 1000) + 100,
          minValue: Math.floor(Math.random() * 10) + 1,
          maxValue: Math.floor(Math.random() * 500) + 100,
          breakdown: {
            eventTypes: {
              user_login: Math.floor(Math.random() * 100) + 10,
              user_logout: Math.floor(Math.random() * 100) + 10,
              api_call: Math.floor(Math.random() * 100) + 10,
            },
            users: Math.floor(Math.random() * 50) + 5,
          },
          timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        aggregates.push(aggregate);
      }
    }

    await this.aggregateRepository.save(aggregates);
    logSuccess(
      `Generated ${aggregates.length} analytics aggregates for ${tenant.name}`
    );
  }

  private async generateAnalyticsAlerts(tenant: any) {
    logStep(`Generating analytics alerts for ${tenant.name}`);

    const alerts = [
      {
        alertName: 'High Login Rate',
        description: 'Alert when login rate exceeds 100 per hour',
        severity: 'high',
        metricName: 'user_login',
        condition: 'gt',
        threshold: 100,
        isActive: true,
        triggerCount: Math.floor(Math.random() * 5),
        lastTriggeredAt: Math.random() > 0.5 ? new Date() : null,
        metadata: {
          notificationEmail: 'admin@example.com',
          notificationSlack: '#alerts',
        },
      },
      {
        alertName: 'Low User Activity',
        description: 'Alert when user activity drops below 10 per hour',
        severity: 'medium',
        metricName: 'user_activity',
        condition: 'lt',
        threshold: 10,
        isActive: true,
        triggerCount: Math.floor(Math.random() * 3),
        lastTriggeredAt: Math.random() > 0.7 ? new Date() : null,
        metadata: {
          notificationEmail: 'manager@example.com',
        },
      },
      {
        alertName: 'System Error Rate',
        description: 'Alert when error rate exceeds 5%',
        severity: 'critical',
        metricName: 'error_rate',
        condition: 'gt',
        threshold: 5,
        isActive: true,
        triggerCount: Math.floor(Math.random() * 2),
        lastTriggeredAt: Math.random() > 0.8 ? new Date() : null,
        metadata: {
          notificationEmail: 'admin@example.com',
          notificationSlack: '#critical-alerts',
        },
      },
    ];

    const alertEntities = alerts.map(alert =>
      this.alertRepository.create({
        id: uuidv4(),
        tenantId: tenant.id,
        ...alert,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await this.alertRepository.save(alertEntities);
    logSuccess(
      `Generated ${alertEntities.length} analytics alerts for ${tenant.name}`
    );
  }

  private async generateAnalyticsReports(tenant: any) {
    logStep(`Generating analytics reports for ${tenant.name}`);

    const reports = [
      {
        reportType: 'daily_summary',
        reportName: 'Daily Analytics Summary',
        description: 'Daily summary of all analytics events',
        status: 'completed',
        format: 'json',
        downloadUrl: `https://api.example.com/reports/${uuidv4()}/download`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: {
          period: 'daily',
          eventCount: Math.floor(Math.random() * 1000) + 100,
          userCount: Math.floor(Math.random() * 50) + 10,
        },
        completedAt: new Date(),
      },
      {
        reportType: 'weekly_summary',
        reportName: 'Weekly Analytics Summary',
        description: 'Weekly summary of all analytics events',
        status: 'completed',
        format: 'csv',
        downloadUrl: `https://api.example.com/reports/${uuidv4()}/download`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        metadata: {
          period: 'weekly',
          eventCount: Math.floor(Math.random() * 5000) + 1000,
          userCount: Math.floor(Math.random() * 100) + 20,
        },
        completedAt: new Date(),
      },
      {
        reportType: 'monthly_summary',
        reportName: 'Monthly Analytics Summary',
        description: 'Monthly summary of all analytics events',
        status: 'processing',
        format: 'pdf',
        metadata: {
          period: 'monthly',
          eventCount: Math.floor(Math.random() * 20000) + 5000,
          userCount: Math.floor(Math.random() * 200) + 50,
        },
      },
    ];

    const reportEntities = reports.map(report =>
      this.reportRepository.create({
        id: uuidv4(),
        tenantId: tenant.id,
        ...report,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await this.reportRepository.save(reportEntities);
    logSuccess(
      `Generated ${reportEntities.length} analytics reports for ${tenant.name}`
    );
  }

  async cleanup() {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      logSuccess('Database connection closed');
    }
  }
}

// Main execution
async function main() {
  const seeder = new AnalyticsSeeder();

  try {
    await seeder.initialize();
    await seeder.seed();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError(`Analytics seeding failed: ${errorMessage}`);
    process.exit(1);
  } finally {
    await seeder.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
