import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateRBAC1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create permissions table
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
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
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resource',
            type: 'enum',
            enum: [
              'users',
              'roles',
              'permissions',
              'tenants',
              'teams',
              'sessions',
              'billing',
              'subscriptions',
              'invoices',
              'payments',
              'files',
              'documents',
              'notifications',
              'emails',
              'reports',
              'analytics',
              'audit_logs',
              'system_settings',
              'feature_flags',
              'api_keys',
              'webhooks',
            ],
            isNullable: false,
          },
          {
            name: 'action',
            type: 'enum',
            enum: [
              'create',
              'read',
              'update',
              'delete',
              'manage',
              'approve',
              'reject',
              'export',
              'import',
              'assign',
              'revoke',
            ],
            isNullable: false,
          },
          {
            name: 'scope',
            type: 'enum',
            enum: ['global', 'tenant', 'team', 'user'],
            default: "'tenant'",
            isNullable: false,
          },
          {
            name: 'isSystem',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'conditions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
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

    // Create roles table
    await queryRunner.createTable(
      new Table({
        name: 'roles',
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
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['system', 'custom'],
            default: "'custom'",
            isNullable: false,
          },
          {
            name: 'level',
            type: 'enum',
            enum: ['1', '2', '3', '4', '5'],
            default: "'5'",
            isNullable: false,
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'parentRoleId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'isSystem',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
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

    // Create role_permissions junction table
    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          {
            name: 'roleId',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'permissionId',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'assignedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create user_roles junction table
    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          {
            name: 'userId',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'roleId',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'assignedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'assignedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create indexes for permissions table
    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_permissions_resource_action_scope',
        columnNames: ['resource', 'action', 'scope'],
      })
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_permissions_scope',
        columnNames: ['scope'],
      })
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_permissions_isSystem',
        columnNames: ['isSystem'],
      })
    );

    // Create indexes for roles table
    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'IDX_roles_name_tenantId',
        columnNames: ['name', 'tenantId'],
      })
    );

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'IDX_roles_level',
        columnNames: ['level'],
      })
    );

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'IDX_roles_isSystem',
        columnNames: ['isSystem'],
      })
    );

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'IDX_roles_tenantId',
        columnNames: ['tenantId'],
      })
    );

    // Create indexes for junction tables
    await queryRunner.createIndex(
      'role_permissions',
      new TableIndex({
        name: 'IDX_role_permissions_roleId',
        columnNames: ['roleId'],
      })
    );

    await queryRunner.createIndex(
      'role_permissions',
      new TableIndex({
        name: 'IDX_role_permissions_permissionId',
        columnNames: ['permissionId'],
      })
    );

    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'IDX_user_roles_userId',
        columnNames: ['userId'],
      })
    );

    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'IDX_user_roles_roleId',
        columnNames: ['roleId'],
      })
    );

    // Create foreign keys for roles table
    await queryRunner.createForeignKey(
      'roles',
      new TableForeignKey({
        name: 'FK_roles_tenantId',
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'roles',
      new TableForeignKey({
        name: 'FK_roles_parentRoleId',
        columnNames: ['parentRoleId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'roles',
        onDelete: 'SET NULL',
      })
    );

    // Create foreign keys for role_permissions table
    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        name: 'FK_role_permissions_roleId',
        columnNames: ['roleId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'roles',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        name: 'FK_role_permissions_permissionId',
        columnNames: ['permissionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'permissions',
        onDelete: 'CASCADE',
      })
    );

    // Create foreign keys for user_roles table
    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'FK_user_roles_userId',
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'FK_user_roles_roleId',
        columnNames: ['roleId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'roles',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'FK_user_roles_assignedBy',
        columnNames: ['assignedBy'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys for user_roles table
    await queryRunner.dropForeignKey('user_roles', 'FK_user_roles_assignedBy');
    await queryRunner.dropForeignKey('user_roles', 'FK_user_roles_roleId');
    await queryRunner.dropForeignKey('user_roles', 'FK_user_roles_userId');

    // Drop foreign keys for role_permissions table
    await queryRunner.dropForeignKey(
      'role_permissions',
      'FK_role_permissions_permissionId'
    );
    await queryRunner.dropForeignKey(
      'role_permissions',
      'FK_role_permissions_roleId'
    );

    // Drop foreign keys for roles table
    await queryRunner.dropForeignKey('roles', 'FK_roles_parentRoleId');
    await queryRunner.dropForeignKey('roles', 'FK_roles_tenantId');

    // Drop indexes
    await queryRunner.dropIndex('user_roles', 'IDX_user_roles_roleId');
    await queryRunner.dropIndex('user_roles', 'IDX_user_roles_userId');
    await queryRunner.dropIndex(
      'role_permissions',
      'IDX_role_permissions_permissionId'
    );
    await queryRunner.dropIndex(
      'role_permissions',
      'IDX_role_permissions_roleId'
    );
    await queryRunner.dropIndex('roles', 'IDX_roles_tenantId');
    await queryRunner.dropIndex('roles', 'IDX_roles_isSystem');
    await queryRunner.dropIndex('roles', 'IDX_roles_level');
    await queryRunner.dropIndex('roles', 'IDX_roles_name_tenantId');
    await queryRunner.dropIndex('permissions', 'IDX_permissions_isSystem');
    await queryRunner.dropIndex('permissions', 'IDX_permissions_scope');
    await queryRunner.dropIndex(
      'permissions',
      'IDX_permissions_resource_action_scope'
    );

    // Drop tables
    await queryRunner.dropTable('user_roles');
    await queryRunner.dropTable('role_permissions');
    await queryRunner.dropTable('roles');
    await queryRunner.dropTable('permissions');
  }
}
