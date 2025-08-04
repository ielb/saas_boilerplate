import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateAccountRecovery1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'account_recoveries',
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
            name: 'recoveryToken',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'recoverySessionToken',
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
            name: 'attempts',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'maxAttempts',
            type: 'int',
            default: 3,
            isNullable: false,
          },
          {
            name: 'isCompleted',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'completedAt',
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
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_account_recoveries_userId" ON "account_recoveries" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_account_recoveries_expiresAt" ON "account_recoveries" ("expiresAt")
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "account_recoveries" 
      ADD CONSTRAINT "FK_account_recoveries_userId" 
      FOREIGN KEY ("userId") 
      REFERENCES "users"("id") 
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "account_recoveries" 
      DROP CONSTRAINT "FK_account_recoveries_userId"
    `);

    // Drop table
    await queryRunner.dropTable('account_recoveries');
  }
}
