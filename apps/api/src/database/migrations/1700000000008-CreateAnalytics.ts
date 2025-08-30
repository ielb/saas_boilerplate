import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateAnalytics1700000000008 implements MigrationInterface {
  name = 'CreateAnalytics1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create usage_analytics table
    await queryRunner.createTable(
      new Table({
        name: 'usage_analytics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'eventType',
            type: 'enum',
            enum: [
              'user_login',
              'user_logout',
              'feature_access',
              'api_call',
              'file_upload',
              'file_download',
              'team_created',
              'team_joined',
              'delegation_created',
              'delegation_activated',
              'invitation_sent',
              'invitation_accepted',
              'bulk_import',
              'bulk_export',
              'payment_processed',
              'subscription_changed',
              'custom_event',
            ],
            isNullable: false,
          },
          {
            name: 'eventName',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metricType',
            type: 'enum',
            enum: ['count', 'duration', 'size', 'value', 'percentage'],
            default: "'count'",
            isNullable: false,
          },
          {
            name: 'metricValue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 1,
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'resourceId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'resourceType',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'sessionId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create analytics_aggregates table
    await queryRunner.createTable(
      new Table({
        name: 'analytics_aggregates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'metricName',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'period',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'totalValue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'averageValue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'count',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'minValue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'maxValue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'breakdown',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create analytics_alerts table
    await queryRunner.createTable(
      new Table({
        name: 'analytics_alerts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'alertName',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'severity',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'metricName',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'condition',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'threshold',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'isTriggered',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'lastTriggeredAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create indexes for usage_analytics table
    await queryRunner.createIndex(
      'usage_analytics',
      new TableIndex({
        name: 'IDX_USAGE_ANALYTICS_TENANT_EVENT_TIMESTAMP',
        columnNames: ['tenantId', 'eventType', 'timestamp'],
      })
    );

    await queryRunner.createIndex(
      'usage_analytics',
      new TableIndex({
        name: 'IDX_USAGE_ANALYTICS_TENANT_USER_TIMESTAMP',
        columnNames: ['tenantId', 'userId', 'timestamp'],
      })
    );

    await queryRunner.createIndex(
      'usage_analytics',
      new TableIndex({
        name: 'IDX_USAGE_ANALYTICS_TENANT_TIMESTAMP',
        columnNames: ['tenantId', 'timestamp'],
      })
    );

    await queryRunner.createIndex(
      'usage_analytics',
      new TableIndex({
        name: 'IDX_USAGE_ANALYTICS_TIMESTAMP',
        columnNames: ['timestamp'],
      })
    );

    await queryRunner.createIndex(
      'usage_analytics',
      new TableIndex({
        name: 'IDX_USAGE_ANALYTICS_SESSION',
        columnNames: ['sessionId'],
      })
    );

    await queryRunner.createIndex(
      'usage_analytics',
      new TableIndex({
        name: 'IDX_USAGE_ANALYTICS_RESOURCE',
        columnNames: ['resourceType', 'resourceId'],
      })
    );

    // Create indexes for analytics_aggregates table
    await queryRunner.createIndex(
      'analytics_aggregates',
      new TableIndex({
        name: 'IDX_ANALYTICS_AGGREGATES_TENANT_METRIC_PERIOD',
        columnNames: ['tenantId', 'metricName', 'period', 'timestamp'],
      })
    );

    await queryRunner.createIndex(
      'analytics_aggregates',
      new TableIndex({
        name: 'IDX_ANALYTICS_AGGREGATES_TENANT_TIMESTAMP',
        columnNames: ['tenantId', 'timestamp'],
      })
    );

    await queryRunner.createIndex(
      'analytics_aggregates',
      new TableIndex({
        name: 'IDX_ANALYTICS_AGGREGATES_TIMESTAMP',
        columnNames: ['timestamp'],
      })
    );

    // Create indexes for analytics_alerts table
    await queryRunner.createIndex(
      'analytics_alerts',
      new TableIndex({
        name: 'IDX_ANALYTICS_ALERTS_TENANT_ACTIVE',
        columnNames: ['tenantId', 'isActive'],
      })
    );

    await queryRunner.createIndex(
      'analytics_alerts',
      new TableIndex({
        name: 'IDX_ANALYTICS_ALERTS_TENANT_TRIGGERED',
        columnNames: ['tenantId', 'isTriggered'],
      })
    );

    await queryRunner.createIndex(
      'analytics_alerts',
      new TableIndex({
        name: 'IDX_ANALYTICS_ALERTS_METRIC',
        columnNames: ['metricName'],
      })
    );

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'usage_analytics',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
        name: 'FK_USAGE_ANALYTICS_TENANT',
      })
    );

    await queryRunner.createForeignKey(
      'usage_analytics',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
        name: 'FK_USAGE_ANALYTICS_USER',
      })
    );

    await queryRunner.createForeignKey(
      'analytics_aggregates',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
        name: 'FK_ANALYTICS_AGGREGATES_TENANT',
      })
    );

    await queryRunner.createForeignKey(
      'analytics_alerts',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
        name: 'FK_ANALYTICS_ALERTS_TENANT',
      })
    );

    // Create unique constraints
    await queryRunner.createIndex(
      'analytics_aggregates',
      new TableIndex({
        name: 'UQ_ANALYTICS_AGGREGATES_TENANT_METRIC_PERIOD_TIMESTAMP',
        columnNames: ['tenantId', 'metricName', 'period', 'timestamp'],
        isUnique: true,
      })
    );

    // Create partial indexes for better performance
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_analytics_active_sessions 
      ON usage_analytics (tenantId, sessionId, timestamp) 
      WHERE sessionId IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_analytics_user_activity 
      ON usage_analytics (tenantId, userId, timestamp) 
      WHERE userId IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_analytics_recent_events 
      ON usage_analytics (tenantId, timestamp DESC) 
      WHERE timestamp > NOW() - INTERVAL '30 days';
    `);

    // Create GIN indexes for JSONB columns
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_analytics_metadata 
      ON usage_analytics USING GIN (metadata);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_aggregates_breakdown 
      ON analytics_aggregates USING GIN (breakdown);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_alerts_metadata 
      ON analytics_alerts USING GIN (metadata);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.dropForeignKey(
      'usage_analytics',
      'FK_USAGE_ANALYTICS_TENANT'
    );
    await queryRunner.dropForeignKey(
      'usage_analytics',
      'FK_USAGE_ANALYTICS_USER'
    );
    await queryRunner.dropForeignKey(
      'analytics_aggregates',
      'FK_ANALYTICS_AGGREGATES_TENANT'
    );
    await queryRunner.dropForeignKey(
      'analytics_alerts',
      'FK_ANALYTICS_ALERTS_TENANT'
    );

    // Drop indexes
    await queryRunner.dropIndex(
      'usage_analytics',
      'IDX_USAGE_ANALYTICS_TENANT_EVENT_TIMESTAMP'
    );
    await queryRunner.dropIndex(
      'usage_analytics',
      'IDX_USAGE_ANALYTICS_TENANT_USER_TIMESTAMP'
    );
    await queryRunner.dropIndex(
      'usage_analytics',
      'IDX_USAGE_ANALYTICS_TENANT_TIMESTAMP'
    );
    await queryRunner.dropIndex(
      'usage_analytics',
      'IDX_USAGE_ANALYTICS_TIMESTAMP'
    );
    await queryRunner.dropIndex(
      'usage_analytics',
      'IDX_USAGE_ANALYTICS_SESSION'
    );
    await queryRunner.dropIndex(
      'usage_analytics',
      'IDX_USAGE_ANALYTICS_RESOURCE'
    );

    await queryRunner.dropIndex(
      'analytics_aggregates',
      'IDX_ANALYTICS_AGGREGATES_TENANT_METRIC_PERIOD'
    );
    await queryRunner.dropIndex(
      'analytics_aggregates',
      'IDX_ANALYTICS_AGGREGATES_TENANT_TIMESTAMP'
    );
    await queryRunner.dropIndex(
      'analytics_aggregates',
      'IDX_ANALYTICS_AGGREGATES_TIMESTAMP'
    );

    await queryRunner.dropIndex(
      'analytics_alerts',
      'IDX_ANALYTICS_ALERTS_TENANT_ACTIVE'
    );
    await queryRunner.dropIndex(
      'analytics_alerts',
      'IDX_ANALYTICS_ALERTS_TENANT_TRIGGERED'
    );
    await queryRunner.dropIndex(
      'analytics_alerts',
      'IDX_ANALYTICS_ALERTS_METRIC'
    );

    await queryRunner.dropIndex(
      'analytics_aggregates',
      'UQ_ANALYTICS_AGGREGATES_TENANT_METRIC_PERIOD_TIMESTAMP'
    );

    // Drop custom indexes
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_usage_analytics_active_sessions;'
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_usage_analytics_user_activity;'
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_usage_analytics_recent_events;'
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_usage_analytics_metadata;'
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_analytics_aggregates_breakdown;'
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_analytics_alerts_metadata;'
    );

    // Drop tables
    await queryRunner.dropTable('analytics_alerts');
    await queryRunner.dropTable('analytics_aggregates');
    await queryRunner.dropTable('usage_analytics');
  }
}
