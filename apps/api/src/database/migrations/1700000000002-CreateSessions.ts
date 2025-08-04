import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateSessions1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'refreshTokenHash',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'deviceFingerprint',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'deviceName',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'deviceType',
            type: 'enum',
            enum: ['desktop', 'mobile', 'tablet', 'unknown'],
            default: "'unknown'",
            isNullable: false,
          },
          {
            name: 'browser',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'browserVersion',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'operatingSystem',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'osVersion',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: false,
          },
          {
            name: 'userAgent',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'expired', 'revoked', 'suspicious'],
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'isTrusted',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'isRememberMe',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'lastActivityAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'revokedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'revokedReason',
            type: 'varchar',
            length: '255',
            isNullable: true,
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

    // Create indexes
    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        name: 'IDX_sessions_userId_status',
        columnNames: ['userId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        name: 'IDX_sessions_refreshTokenHash',
        columnNames: ['refreshTokenHash'],
      })
    );

    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        name: 'IDX_sessions_deviceFingerprint',
        columnNames: ['deviceFingerprint'],
      })
    );

    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        name: 'IDX_sessions_expiresAt',
        columnNames: ['expiresAt'],
      })
    );

    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        name: 'IDX_sessions_lastActivityAt',
        columnNames: ['lastActivityAt'],
      })
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'sessions',
      new TableForeignKey({
        name: 'FK_sessions_userId',
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('sessions', 'FK_sessions_userId');

    // Drop indexes
    await queryRunner.dropIndex('sessions', 'IDX_sessions_userId_status');
    await queryRunner.dropIndex('sessions', 'IDX_sessions_refreshTokenHash');
    await queryRunner.dropIndex('sessions', 'IDX_sessions_deviceFingerprint');
    await queryRunner.dropIndex('sessions', 'IDX_sessions_expiresAt');
    await queryRunner.dropIndex('sessions', 'IDX_sessions_lastActivityAt');

    // Drop table
    await queryRunner.dropTable('sessions');
  }
}
