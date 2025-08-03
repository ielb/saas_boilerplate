import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateRefreshTokens1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token_id',
            type: 'uuid',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'token_hash',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'is_revoked',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'replaced_by_token_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'replaces_token_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'device_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'device_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'device_type',
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
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // Create indexes using raw SQL
    await queryRunner.query(
      'CREATE INDEX IDX_REFRESH_TOKENS_TOKEN_ID ON refresh_tokens (token_id)'
    );

    await queryRunner.query(
      'CREATE INDEX IDX_REFRESH_TOKENS_USER_REVOKED ON refresh_tokens (user_id, is_revoked)'
    );

    await queryRunner.query(
      'CREATE INDEX IDX_REFRESH_TOKENS_EXPIRES_AT ON refresh_tokens (expires_at)'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('refresh_tokens');
  }
}
