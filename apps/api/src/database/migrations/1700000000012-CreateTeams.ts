import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateTeams1700000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create teams table
    await queryRunner.createTable(
      new Table({
        name: 'teams',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
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
            name: 'managerId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'archived'],
            default: "'active'",
          },
          {
            name: 'settings',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'avatarUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
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
        ],
      }),
      true
    );

    // Create team_memberships table
    await queryRunner.createTable(
      new Table({
        name: 'team_memberships',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'teamId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'roleId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'invitedById',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'archived'],
            default: "'active'",
          },
          {
            name: 'joinedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'invitedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
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
        ],
      }),
      true
    );

    // Create team_invitations table
    await queryRunner.createTable(
      new Table({
        name: 'team_invitations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'teamId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'roleId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'invitedById',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'accepted', 'expired', 'cancelled'],
            default: "'pending'",
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
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
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
        ],
      }),
      true
    );

    // Create indexes for teams table
    await queryRunner.createIndex(
      'teams',
      new TableIndex({
        name: 'IDX_teams_tenantId',
        columnNames: ['tenantId'],
      })
    );

    await queryRunner.createIndex(
      'teams',
      new TableIndex({
        name: 'IDX_teams_tenantId_name',
        columnNames: ['tenantId', 'name'],
      })
    );

    await queryRunner.createIndex(
      'teams',
      new TableIndex({
        name: 'IDX_teams_managerId',
        columnNames: ['managerId'],
      })
    );

    await queryRunner.createIndex(
      'teams',
      new TableIndex({
        name: 'IDX_teams_status',
        columnNames: ['status'],
      })
    );

    // Create indexes for team_memberships table
    await queryRunner.createIndex(
      'team_memberships',
      new TableIndex({
        name: 'IDX_team_memberships_tenantId',
        columnNames: ['tenantId'],
      })
    );

    await queryRunner.createIndex(
      'team_memberships',
      new TableIndex({
        name: 'IDX_team_memberships_teamId',
        columnNames: ['teamId'],
      })
    );

    await queryRunner.createIndex(
      'team_memberships',
      new TableIndex({
        name: 'IDX_team_memberships_userId',
        columnNames: ['userId'],
      })
    );

    await queryRunner.createIndex(
      'team_memberships',
      new TableIndex({
        name: 'IDX_team_memberships_teamId_userId',
        columnNames: ['teamId', 'userId'],
      })
    );

    await queryRunner.createIndex(
      'team_memberships',
      new TableIndex({
        name: 'IDX_team_memberships_roleId',
        columnNames: ['roleId'],
      })
    );

    await queryRunner.createIndex(
      'team_memberships',
      new TableIndex({
        name: 'IDX_team_memberships_status',
        columnNames: ['status'],
      })
    );

    // Create indexes for team_invitations table
    await queryRunner.createIndex(
      'team_invitations',
      new TableIndex({
        name: 'IDX_team_invitations_tenantId',
        columnNames: ['tenantId'],
      })
    );

    await queryRunner.createIndex(
      'team_invitations',
      new TableIndex({
        name: 'IDX_team_invitations_teamId',
        columnNames: ['teamId'],
      })
    );

    await queryRunner.createIndex(
      'team_invitations',
      new TableIndex({
        name: 'IDX_team_invitations_email',
        columnNames: ['email'],
      })
    );

    await queryRunner.createIndex(
      'team_invitations',
      new TableIndex({
        name: 'IDX_team_invitations_teamId_email',
        columnNames: ['teamId', 'email'],
      })
    );

    await queryRunner.createIndex(
      'team_invitations',
      new TableIndex({
        name: 'IDX_team_invitations_token',
        columnNames: ['token'],
      })
    );

    await queryRunner.createIndex(
      'team_invitations',
      new TableIndex({
        name: 'IDX_team_invitations_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'team_invitations',
      new TableIndex({
        name: 'IDX_team_invitations_expiresAt',
        columnNames: ['expiresAt'],
      })
    );

    // Create foreign key constraints for teams table
    await queryRunner.createForeignKey(
      'teams',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'teams',
      new TableForeignKey({
        columnNames: ['managerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      })
    );

    // Create foreign key constraints for team_memberships table
    await queryRunner.createForeignKey(
      'team_memberships',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'team_memberships',
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'teams',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'team_memberships',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'team_memberships',
      new TableForeignKey({
        columnNames: ['roleId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'roles',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'team_memberships',
      new TableForeignKey({
        columnNames: ['invitedById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      })
    );

    // Create foreign key constraints for team_invitations table
    await queryRunner.createForeignKey(
      'team_invitations',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'team_invitations',
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'teams',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'team_invitations',
      new TableForeignKey({
        columnNames: ['roleId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'roles',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'team_invitations',
      new TableForeignKey({
        columnNames: ['invitedById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    // Create unique constraints
    await queryRunner.query(
      'ALTER TABLE teams ADD CONSTRAINT UQ_teams_tenantId_name UNIQUE ("tenantId", "name")'
    );

    await queryRunner.query(
      'ALTER TABLE team_memberships ADD CONSTRAINT UQ_team_memberships_teamId_userId UNIQUE ("teamId", "userId")'
    );

    await queryRunner.query(
      'ALTER TABLE team_invitations ADD CONSTRAINT UQ_team_invitations_teamId_email UNIQUE ("teamId", "email")'
    );

    await queryRunner.query(
      'ALTER TABLE team_invitations ADD CONSTRAINT UQ_team_invitations_token UNIQUE ("token")'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    const teamsTable = await queryRunner.getTable('teams');
    const teamMembershipsTable = await queryRunner.getTable('team_memberships');
    const teamInvitationsTable = await queryRunner.getTable('team_invitations');

    if (teamsTable) {
      const foreignKeys = teamsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('teams', foreignKey);
      }
    }

    if (teamMembershipsTable) {
      const foreignKeys = teamMembershipsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('team_memberships', foreignKey);
      }
    }

    if (teamInvitationsTable) {
      const foreignKeys = teamInvitationsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('team_invitations', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('team_invitations');
    await queryRunner.dropTable('team_memberships');
    await queryRunner.dropTable('teams');
  }
}
