import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateFiles1700000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'files',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'originalName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'mimeType',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'size',
            type: 'bigint',
          },
          {
            name: 'extension',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'path',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'publicUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'storageProvider',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['uploading', 'processing', 'ready', 'failed', 'deleted'],
            default: "'uploading'",
          },
          {
            name: 'visibility',
            type: 'enum',
            enum: ['private', 'public', 'tenant', 'team'],
            default: "'private'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'virusScanResult',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isVirusScanned',
            type: 'boolean',
            default: false,
          },
          {
            name: 'checksum',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'uploadSessionId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'uploadedById',
            type: 'uuid',
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'permissions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
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
      'files',
      new TableIndex({
        name: 'IDX_FILES_KEY',
        columnNames: ['key'],
      })
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_UPLOADED_BY',
        columnNames: ['uploadedById'],
      })
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_TENANT',
        columnNames: ['tenantId'],
      })
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_STATUS',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_VISIBILITY',
        columnNames: ['visibility'],
      })
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_CREATED_AT',
        columnNames: ['createdAt'],
      })
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_UPLOAD_SESSION',
        columnNames: ['uploadSessionId'],
      })
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_IS_DELETED',
        columnNames: ['isDeleted'],
      })
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'files',
      new TableForeignKey({
        name: 'FK_FILES_UPLOADED_BY',
        columnNames: ['uploadedById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'files',
      new TableForeignKey({
        name: 'FK_FILES_TENANT',
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('files', 'FK_FILES_TENANT');
    await queryRunner.dropForeignKey('files', 'FK_FILES_UPLOADED_BY');

    // Drop indexes
    await queryRunner.dropIndex('files', 'IDX_FILES_IS_DELETED');
    await queryRunner.dropIndex('files', 'IDX_FILES_UPLOAD_SESSION');
    await queryRunner.dropIndex('files', 'IDX_FILES_CREATED_AT');
    await queryRunner.dropIndex('files', 'IDX_FILES_VISIBILITY');
    await queryRunner.dropIndex('files', 'IDX_FILES_STATUS');
    await queryRunner.dropIndex('files', 'IDX_FILES_TENANT');
    await queryRunner.dropIndex('files', 'IDX_FILES_UPLOADED_BY');
    await queryRunner.dropIndex('files', 'IDX_FILES_KEY');

    // Drop table
    await queryRunner.dropTable('files');
  }
}
