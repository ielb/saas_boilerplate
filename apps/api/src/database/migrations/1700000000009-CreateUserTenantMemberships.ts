import {
  MigrationInterface,
  QueryRunner,
  Table,
  Index,
  ForeignKey,
} from 'typeorm';

export class CreateUserTenantMemberships1700000000009
  implements MigrationInterface
{
  name = 'CreateUserTenantMemberships1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_tenant_memberships table
    await queryRunner.createTable(
      new Table({
        name: 'user_tenant_memberships',
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
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['owner', 'admin', 'manager', 'member', 'viewer'],
            default: "'member'",
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'pending', 'suspended', 'expired'],
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'joinedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'lastAccessedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'invitedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'invitationToken',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'invitationExpiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
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
            onUpdate: 'CURRENT_TIMESTAMP',
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

    // Create unique index on userId + tenantId
    await queryRunner.createIndex(
      'user_tenant_memberships',
      Index({
        name: 'IDX_user_tenant_unique',
        columnNames: ['userId', 'tenantId'],
        isUnique: true,
      })
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'user_tenant_memberships',
      Index({
        name: 'IDX_user_tenant_memberships_userId',
        columnNames: ['userId'],
      })
    );

    await queryRunner.createIndex(
      'user_tenant_memberships',
      Index({
        name: 'IDX_user_tenant_memberships_tenantId',
        columnNames: ['tenantId'],
      })
    );

    await queryRunner.createIndex(
      'user_tenant_memberships',
      Index({
        name: 'IDX_user_tenant_memberships_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'user_tenant_memberships',
      Index({
        name: 'IDX_user_tenant_memberships_role',
        columnNames: ['role'],
      })
    );

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'user_tenant_memberships',
      ForeignKey({
        name: 'FK_user_tenant_memberships_userId',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'user_tenant_memberships',
      ForeignKey({
        name: 'FK_user_tenant_memberships_tenantId',
        columnNames: ['tenantId'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'user_tenant_memberships',
      ForeignKey({
        name: 'FK_user_tenant_memberships_invitedBy',
        columnNames: ['invitedBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      })
    );

    // Create user_membership_permissions junction table
    await queryRunner.createTable(
      new Table({
        name: 'user_membership_permissions',
        columns: [
          {
            name: 'membershipId',
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

    // Create foreign keys for junction table
    await queryRunner.createForeignKey(
      'user_membership_permissions',
      ForeignKey({
        name: 'FK_user_membership_permissions_membershipId',
        columnNames: ['membershipId'],
        referencedTableName: 'user_tenant_memberships',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'user_membership_permissions',
      ForeignKey({
        name: 'FK_user_membership_permissions_permissionId',
        columnNames: ['permissionId'],
        referencedTableName: 'permissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    // Migrate existing users to have memberships for their current tenant
    // This ensures backward compatibility
    await queryRunner.query(`
      INSERT INTO user_tenant_memberships (userId, tenantId, role, status, joinedAt, lastAccessedAt)
      SELECT 
        u.id as userId,
        u.tenantId as tenantId,
        u.role as role,
        CASE 
          WHEN u.status = 'active' THEN 'active'::user_tenant_memberships_status_enum
          WHEN u.status = 'pending' THEN 'pending'::user_tenant_memberships_status_enum
          WHEN u.status = 'suspended' THEN 'suspended'::user_tenant_memberships_status_enum
          ELSE 'active'::user_tenant_memberships_status_enum
        END as status,
        u.createdAt as joinedAt,
        u.lastLoginAt as lastAccessedAt
      FROM users u
      WHERE u.tenantId IS NOT NULL
      AND u.deletedAt IS NULL
    `);

    console.log(
      '✅ Migration completed: Created user_tenant_memberships table and migrated existing users'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.dropForeignKey(
      'user_membership_permissions',
      'FK_user_membership_permissions_permissionId'
    );
    await queryRunner.dropForeignKey(
      'user_membership_permissions',
      'FK_user_membership_permissions_membershipId'
    );
    await queryRunner.dropTable('user_membership_permissions');

    await queryRunner.dropForeignKey(
      'user_tenant_memberships',
      'FK_user_tenant_memberships_invitedBy'
    );
    await queryRunner.dropForeignKey(
      'user_tenant_memberships',
      'FK_user_tenant_memberships_tenantId'
    );
    await queryRunner.dropForeignKey(
      'user_tenant_memberships',
      'FK_user_tenant_memberships_userId'
    );

    // Drop indexes
    await queryRunner.dropIndex(
      'user_tenant_memberships',
      'IDX_user_tenant_memberships_role'
    );
    await queryRunner.dropIndex(
      'user_tenant_memberships',
      'IDX_user_tenant_memberships_status'
    );
    await queryRunner.dropIndex(
      'user_tenant_memberships',
      'IDX_user_tenant_memberships_tenantId'
    );
    await queryRunner.dropIndex(
      'user_tenant_memberships',
      'IDX_user_tenant_memberships_userId'
    );
    await queryRunner.dropIndex(
      'user_tenant_memberships',
      'IDX_user_tenant_unique'
    );

    // Drop table
    await queryRunner.dropTable('user_tenant_memberships');

    console.log('✅ Migration reverted: Dropped user_tenant_memberships table');
  }
}
