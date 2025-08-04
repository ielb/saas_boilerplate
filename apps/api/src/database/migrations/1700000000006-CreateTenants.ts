import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateTenants1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tenants table
    await queryRunner.createTable(
      new Table({
        name: 'tenants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'domain',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'logo',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'primaryColor',
            type: 'varchar',
            length: '7',
            isNullable: true,
          },
          {
            name: 'secondaryColor',
            type: 'varchar',
            length: '7',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'contactEmail',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'contactPhone',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'postalCode',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'locale',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'isVerified',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'verifiedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'plan',
            type: 'varchar',
            length: '50',
            default: "'free'",
            isNullable: false,
          },
          {
            name: 'planExpiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'maxUsers',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'maxStorage',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'features',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'trialEndsAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'trialExpired',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'stripeCustomerId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripeSubscriptionId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'tenants',
      new TableIndex({
        name: 'IDX_tenants_name',
        columnNames: ['name'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'tenants',
      new TableIndex({
        name: 'IDX_tenants_domain',
        columnNames: ['domain'],
        isUnique: true,
        where: '"domain" IS NOT NULL',
      })
    );

    await queryRunner.createIndex(
      'tenants',
      new TableIndex({
        name: 'IDX_tenants_isActive',
        columnNames: ['isActive'],
      })
    );

    await queryRunner.createIndex(
      'tenants',
      new TableIndex({
        name: 'IDX_tenants_plan',
        columnNames: ['plan'],
      })
    );

    await queryRunner.createIndex(
      'tenants',
      new TableIndex({
        name: 'IDX_tenants_stripeCustomerId',
        columnNames: ['stripeCustomerId'],
        isUnique: true,
        where: '"stripeCustomerId" IS NOT NULL',
      })
    );

    await queryRunner.createIndex(
      'tenants',
      new TableIndex({
        name: 'IDX_tenants_stripeSubscriptionId',
        columnNames: ['stripeSubscriptionId'],
        isUnique: true,
        where: '"stripeSubscriptionId" IS NOT NULL',
      })
    );

    await queryRunner.createIndex(
      'tenants',
      new TableIndex({
        name: 'IDX_tenants_createdAt',
        columnNames: ['createdAt'],
      })
    );

    await queryRunner.createIndex(
      'tenants',
      new TableIndex({
        name: 'IDX_tenants_trialEndsAt',
        columnNames: ['trialEndsAt'],
      })
    );

    // Create tenant usage tracking table
    await queryRunner.createTable(
      new Table({
        name: 'tenant_usage',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'metric',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'value',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'limit',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create indexes for tenant_usage table
    await queryRunner.createIndex(
      'tenant_usage',
      new TableIndex({
        name: 'IDX_tenant_usage_tenantId',
        columnNames: ['tenantId'],
      })
    );

    await queryRunner.createIndex(
      'tenant_usage',
      new TableIndex({
        name: 'IDX_tenant_usage_date',
        columnNames: ['date'],
      })
    );

    await queryRunner.createIndex(
      'tenant_usage',
      new TableIndex({
        name: 'IDX_tenant_usage_metric',
        columnNames: ['metric'],
      })
    );

    await queryRunner.createIndex(
      'tenant_usage',
      new TableIndex({
        name: 'IDX_tenant_usage_tenantId_date_metric',
        columnNames: ['tenantId', 'date', 'metric'],
        isUnique: true,
      })
    );

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'tenant_usage',
      new TableForeignKey({
        name: 'FK_tenant_usage_tenantId',
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    // Create tenant feature flags table
    await queryRunner.createTable(
      new Table({
        name: 'tenant_feature_flags',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'feature',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'isEnabled',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create indexes for tenant_feature_flags table
    await queryRunner.createIndex(
      'tenant_feature_flags',
      new TableIndex({
        name: 'IDX_tenant_feature_flags_tenantId',
        columnNames: ['tenantId'],
      })
    );

    await queryRunner.createIndex(
      'tenant_feature_flags',
      new TableIndex({
        name: 'IDX_tenant_feature_flags_feature',
        columnNames: ['feature'],
      })
    );

    await queryRunner.createIndex(
      'tenant_feature_flags',
      new TableIndex({
        name: 'IDX_tenant_feature_flags_tenantId_feature',
        columnNames: ['tenantId', 'feature'],
        isUnique: true,
      })
    );

    // Create foreign key constraints for tenant_feature_flags
    await queryRunner.createForeignKey(
      'tenant_feature_flags',
      new TableForeignKey({
        name: 'FK_tenant_feature_flags_tenantId',
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    // Insert default tenant (for system operations)
    await queryRunner.query(`
      INSERT INTO tenants (
        id, name, domain, isActive, isVerified, plan, maxUsers, maxStorage, 
        features, settings, metadata, createdAt, updatedAt
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        'System Tenant',
        'system.local',
        true,
        true,
        'enterprise',
        0,
        0,
        '["all"]',
        '{"system": true}',
        '{"type": "system"}',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.dropForeignKey(
      'tenant_feature_flags',
      'FK_tenant_feature_flags_tenantId'
    );
    await queryRunner.dropForeignKey(
      'tenant_usage',
      'FK_tenant_usage_tenantId'
    );

    // Drop indexes
    await queryRunner.dropIndex(
      'tenant_feature_flags',
      'IDX_tenant_feature_flags_tenantId_feature'
    );
    await queryRunner.dropIndex(
      'tenant_feature_flags',
      'IDX_tenant_feature_flags_feature'
    );
    await queryRunner.dropIndex(
      'tenant_feature_flags',
      'IDX_tenant_feature_flags_tenantId'
    );
    await queryRunner.dropIndex(
      'tenant_usage',
      'IDX_tenant_usage_tenantId_date_metric'
    );
    await queryRunner.dropIndex('tenant_usage', 'IDX_tenant_usage_metric');
    await queryRunner.dropIndex('tenant_usage', 'IDX_tenant_usage_date');
    await queryRunner.dropIndex('tenant_usage', 'IDX_tenant_usage_tenantId');
    await queryRunner.dropIndex('tenants', 'IDX_tenants_trialEndsAt');
    await queryRunner.dropIndex('tenants', 'IDX_tenants_createdAt');
    await queryRunner.dropIndex('tenants', 'IDX_tenants_stripeSubscriptionId');
    await queryRunner.dropIndex('tenants', 'IDX_tenants_stripeCustomerId');
    await queryRunner.dropIndex('tenants', 'IDX_tenants_plan');
    await queryRunner.dropIndex('tenants', 'IDX_tenants_isActive');
    await queryRunner.dropIndex('tenants', 'IDX_tenants_domain');
    await queryRunner.dropIndex('tenants', 'IDX_tenants_name');

    // Drop tables
    await queryRunner.dropTable('tenant_feature_flags');
    await queryRunner.dropTable('tenant_usage');
    await queryRunner.dropTable('tenants');
  }
}
