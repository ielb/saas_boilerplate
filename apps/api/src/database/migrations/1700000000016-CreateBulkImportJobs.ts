import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateBulkImportJobs1700000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create bulk_import_jobs table
    await queryRunner.createTable(
      new Table({
        name: 'bulk_import_jobs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'total_records',
            type: 'integer',
            isNullable: false,
            default: '0',
          },
          {
            name: 'processed_records',
            type: 'integer',
            isNullable: false,
            default: '0',
          },
          {
            name: 'successful_records',
            type: 'integer',
            isNullable: false,
            default: '0',
          },
          {
            name: 'failed_records',
            type: 'integer',
            isNullable: false,
            default: '0',
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_size',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'options',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Create import_errors table
    await queryRunner.createTable(
      new Table({
        name: 'import_errors',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'job_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'row_number',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'field_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'raw_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      'bulk_import_jobs',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'bulk_import_jobs',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'import_errors',
      new TableForeignKey({
        columnNames: ['job_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'bulk_import_jobs',
        onDelete: 'CASCADE',
      })
    );

    // Add indexes for performance
    await queryRunner.query(
      'CREATE INDEX IDX_bulk_import_jobs_tenant_id ON bulk_import_jobs (tenant_id)'
    );
    await queryRunner.query(
      'CREATE INDEX IDX_bulk_import_jobs_status ON bulk_import_jobs (status)'
    );
    await queryRunner.query(
      'CREATE INDEX IDX_bulk_import_jobs_created_by ON bulk_import_jobs (created_by)'
    );
    await queryRunner.query(
      'CREATE INDEX IDX_import_errors_job_id ON import_errors (job_id)'
    );
    await queryRunner.query(
      'CREATE INDEX IDX_import_errors_row_number ON import_errors (row_number)'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('import_errors');
    await queryRunner.dropTable('bulk_import_jobs');
  }
}
