import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateUserProfiles1700000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_profiles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
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
            isNullable: true,
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'displayName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'bio',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'avatarUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'avatarFileKey',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'jobTitle',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'department',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'website',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'linkedinUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'twitterUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'githubUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'privacyLevel',
            type: 'enum',
            enum: ['public', 'tenant_only', 'private'],
            default: "'tenant_only'",
          },
          {
            name: 'completionStatus',
            type: 'enum',
            enum: ['incomplete', 'basic', 'complete'],
            default: "'incomplete'",
          },
          {
            name: 'preferences',
            type: 'jsonb',
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

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'user_profiles',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'user_profiles',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'user_profiles',
      new TableIndex({
        name: 'IDX_USER_PROFILES_USER_ID',
        columnNames: ['userId'],
      })
    );

    await queryRunner.createIndex(
      'user_profiles',
      new TableIndex({
        name: 'IDX_USER_PROFILES_TENANT_ID',
        columnNames: ['tenantId'],
      })
    );

    await queryRunner.createIndex(
      'user_profiles',
      new TableIndex({
        name: 'IDX_USER_PROFILES_PRIVACY_LEVEL',
        columnNames: ['privacyLevel'],
      })
    );

    await queryRunner.createIndex(
      'user_profiles',
      new TableIndex({
        name: 'IDX_USER_PROFILES_COMPLETION_STATUS',
        columnNames: ['completionStatus'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const table = await queryRunner.getTable('user_profiles');
    const foreignKeys = table?.foreignKeys || [];

    for (const foreignKey of foreignKeys) {
      await queryRunner.dropForeignKey('user_profiles', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('user_profiles', 'IDX_USER_PROFILES_USER_ID');
    await queryRunner.dropIndex('user_profiles', 'IDX_USER_PROFILES_TENANT_ID');
    await queryRunner.dropIndex(
      'user_profiles',
      'IDX_USER_PROFILES_PRIVACY_LEVEL'
    );
    await queryRunner.dropIndex(
      'user_profiles',
      'IDX_USER_PROFILES_COMPLETION_STATUS'
    );

    // Drop table
    await queryRunner.dropTable('user_profiles');
  }
}
