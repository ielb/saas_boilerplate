import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateDelegations1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create delegations table
    await queryRunner.createTable(
      new Table({
        name: 'delegations',
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
            name: 'delegatorId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'delegateId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'approverId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'title',
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
            name: 'delegationType',
            type: 'enum',
            enum: ['permission_based', 'role_based', 'full_access'],
            default: "'permission_based'",
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'pending',
              'approved',
              'rejected',
              'expired',
              'revoked',
              'active',
            ],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'requestedAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'approvedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'rejectedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'revokedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'activatedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'approvalNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'rejectionReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'revocationReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'requiresApproval',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'isEmergency',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'isRecurring',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'recurrencePattern',
            type: 'varchar',
            length: '100',
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

    // Create delegation_audit_logs table
    await queryRunner.createTable(
      new Table({
        name: 'delegation_audit_logs',
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
            name: 'delegationId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'details',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
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
        ],
      }),
      true
    );

    // Create delegation_permissions junction table
    await queryRunner.createTable(
      new Table({
        name: 'delegation_permissions',
        columns: [
          {
            name: 'delegationId',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'permissionId',
            type: 'uuid',
            isPrimary: true,
          },
        ],
      }),
      true
    );

    // Create indexes for delegations table
    await queryRunner.createIndex(
      'delegations',
      new TableIndex({
        name: 'IDX_delegations_delegator_delegate_tenant',
        columnNames: ['delegatorId', 'delegateId', 'tenantId'],
      })
    );

    await queryRunner.createIndex(
      'delegations',
      new TableIndex({
        name: 'IDX_delegations_status_tenant',
        columnNames: ['status', 'tenantId'],
      })
    );

    await queryRunner.createIndex(
      'delegations',
      new TableIndex({
        name: 'IDX_delegations_expires_tenant',
        columnNames: ['expiresAt', 'tenantId'],
      })
    );

    await queryRunner.createIndex(
      'delegations',
      new TableIndex({
        name: 'IDX_delegations_type_tenant',
        columnNames: ['delegationType', 'tenantId'],
      })
    );

    await queryRunner.createIndex(
      'delegations',
      new TableIndex({
        name: 'IDX_delegations_tenant',
        columnNames: ['tenantId'],
      })
    );

    // Create indexes for delegation_audit_logs table
    await queryRunner.createIndex(
      'delegation_audit_logs',
      new TableIndex({
        name: 'IDX_delegation_audit_logs_delegation_tenant',
        columnNames: ['delegationId', 'tenantId'],
      })
    );

    await queryRunner.createIndex(
      'delegation_audit_logs',
      new TableIndex({
        name: 'IDX_delegation_audit_logs_action_tenant',
        columnNames: ['action', 'tenantId'],
      })
    );

    await queryRunner.createIndex(
      'delegation_audit_logs',
      new TableIndex({
        name: 'IDX_delegation_audit_logs_created_tenant',
        columnNames: ['createdAt', 'tenantId'],
      })
    );

    await queryRunner.createIndex(
      'delegation_audit_logs',
      new TableIndex({
        name: 'IDX_delegation_audit_logs_tenant',
        columnNames: ['tenantId'],
      })
    );

    // Create foreign key constraints for delegations table
    await queryRunner.createForeignKey(
      'delegations',
      new TableForeignKey({
        name: 'FK_delegations_tenant',
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'delegations',
      new TableForeignKey({
        name: 'FK_delegations_delegator',
        columnNames: ['delegatorId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'delegations',
      new TableForeignKey({
        name: 'FK_delegations_delegate',
        columnNames: ['delegateId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'delegations',
      new TableForeignKey({
        name: 'FK_delegations_approver',
        columnNames: ['approverId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      })
    );

    // Create foreign key constraints for delegation_audit_logs table
    await queryRunner.createForeignKey(
      'delegation_audit_logs',
      new TableForeignKey({
        name: 'FK_delegation_audit_logs_tenant',
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'delegation_audit_logs',
      new TableForeignKey({
        name: 'FK_delegation_audit_logs_delegation',
        columnNames: ['delegationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'delegations',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'delegation_audit_logs',
      new TableForeignKey({
        name: 'FK_delegation_audit_logs_user',
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    // Create foreign key constraints for delegation_permissions table
    await queryRunner.createForeignKey(
      'delegation_permissions',
      new TableForeignKey({
        name: 'FK_delegation_permissions_delegation',
        columnNames: ['delegationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'delegations',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'delegation_permissions',
      new TableForeignKey({
        name: 'FK_delegation_permissions_permission',
        columnNames: ['permissionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'permissions',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.dropForeignKey(
      'delegation_permissions',
      'FK_delegation_permissions_permission'
    );
    await queryRunner.dropForeignKey(
      'delegation_permissions',
      'FK_delegation_permissions_delegation'
    );
    await queryRunner.dropForeignKey(
      'delegation_audit_logs',
      'FK_delegation_audit_logs_user'
    );
    await queryRunner.dropForeignKey(
      'delegation_audit_logs',
      'FK_delegation_audit_logs_delegation'
    );
    await queryRunner.dropForeignKey(
      'delegation_audit_logs',
      'FK_delegation_audit_logs_tenant'
    );
    await queryRunner.dropForeignKey('delegations', 'FK_delegations_approver');
    await queryRunner.dropForeignKey('delegations', 'FK_delegations_delegate');
    await queryRunner.dropForeignKey('delegations', 'FK_delegations_delegator');
    await queryRunner.dropForeignKey('delegations', 'FK_delegations_tenant');

    // Drop tables
    await queryRunner.dropTable('delegation_permissions');
    await queryRunner.dropTable('delegation_audit_logs');
    await queryRunner.dropTable('delegations');
  }
}
