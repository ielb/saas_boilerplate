import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateInvitations1700000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'invitations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['team_member', 'admin', 'viewer'],
            default: "'team_member'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'accepted', 'expired', 'revoked'],
            default: "'pending'",
          },
          {
            name: 'message',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'token',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'acceptedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'revokedAt',
            type: 'timestamp',
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
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'invitedById',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'roleId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'acceptedById',
            type: 'uuid',
            isNullable: true,
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'invitations',
      new TableIndex({
        name: 'IDX_INVITATIONS_EMAIL_TENANT',
        columnNames: ['email', 'tenantId'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'invitations',
      new TableIndex({
        name: 'IDX_INVITATIONS_TOKEN',
        columnNames: ['token'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'invitations',
      new TableIndex({
        name: 'IDX_INVITATIONS_STATUS_EXPIRES',
        columnNames: ['status', 'expiresAt'],
      })
    );

    await queryRunner.createIndex(
      'invitations',
      new TableIndex({
        name: 'IDX_INVITATIONS_TENANT_STATUS',
        columnNames: ['tenantId', 'status'],
      })
    );

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'invitations',
      new TableForeignKey({
        name: 'FK_INVITATIONS_TENANT',
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'invitations',
      new TableForeignKey({
        name: 'FK_INVITATIONS_INVITED_BY',
        columnNames: ['invitedById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'invitations',
      new TableForeignKey({
        name: 'FK_INVITATIONS_ROLE',
        columnNames: ['roleId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'roles',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'invitations',
      new TableForeignKey({
        name: 'FK_INVITATIONS_ACCEPTED_BY',
        columnNames: ['acceptedById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey(
      'invitations',
      'FK_INVITATIONS_ACCEPTED_BY'
    );
    await queryRunner.dropForeignKey('invitations', 'FK_INVITATIONS_ROLE');
    await queryRunner.dropForeignKey(
      'invitations',
      'FK_INVITATIONS_INVITED_BY'
    );
    await queryRunner.dropForeignKey('invitations', 'FK_INVITATIONS_TENANT');

    // Drop indexes
    await queryRunner.dropIndex('invitations', 'IDX_INVITATIONS_TENANT_STATUS');
    await queryRunner.dropIndex(
      'invitations',
      'IDX_INVITATIONS_STATUS_EXPIRES'
    );
    await queryRunner.dropIndex('invitations', 'IDX_INVITATIONS_TOKEN');
    await queryRunner.dropIndex('invitations', 'IDX_INVITATIONS_EMAIL_TENANT');

    // Drop table
    await queryRunner.dropTable('invitations');
  }
}

