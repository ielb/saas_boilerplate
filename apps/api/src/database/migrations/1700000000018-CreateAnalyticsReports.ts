import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAnalyticsReports1700000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'analytics_reports',
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
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'reportType',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'reportName',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'format',
            type: 'enum',
            enum: ['json', 'csv', 'pdf', 'excel'],
            default: "'json'",
            isNullable: false,
          },
          {
            name: 'downloadUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'expiresAt',
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
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'completedAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'fileSize',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'recordCount',
            type: 'integer',
            isNullable: true,
          },
        ],
        indices: [
          {
            name: 'IDX_analytics_reports_tenant_id',
            columnNames: ['tenantId'],
          },
          {
            name: 'IDX_analytics_reports_status',
            columnNames: ['status'],
          },
          {
            name: 'IDX_analytics_reports_created_at',
            columnNames: ['createdAt'],
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('analytics_reports');
  }
}
