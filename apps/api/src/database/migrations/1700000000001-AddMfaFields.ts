import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMfaFields1700000000001 implements MigrationInterface {
  name = 'AddMfaFields1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "twoFactorSecret" text,
      ADD COLUMN "twoFactorEnabled" boolean NOT NULL DEFAULT false,
      ADD COLUMN "twoFactorVerified" boolean NOT NULL DEFAULT false,
      ADD COLUMN "backupCodes" json,
      ADD COLUMN "twoFactorEnabledAt" timestamp,
      ADD COLUMN "lastTwoFactorAttempt" timestamp,
      ADD COLUMN "twoFactorAttempts" integer NOT NULL DEFAULT 0
    `);

    // Create index for MFA verification
    await queryRunner.query(`
      CREATE INDEX "IDX_users_two_factor_enabled" ON "users" ("twoFactorEnabled")
    `);

    // Create index for MFA attempts tracking
    await queryRunner.query(`
      CREATE INDEX "IDX_users_two_factor_attempts" ON "users" ("twoFactorAttempts", "lastTwoFactorAttempt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_users_two_factor_attempts"`);
    await queryRunner.query(`DROP INDEX "IDX_users_two_factor_enabled"`);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN "twoFactorAttempts",
      DROP COLUMN "lastTwoFactorAttempt",
      DROP COLUMN "twoFactorEnabledAt",
      DROP COLUMN "backupCodes",
      DROP COLUMN "twoFactorVerified",
      DROP COLUMN "twoFactorEnabled",
      DROP COLUMN "twoFactorSecret"
    `);
  }
}
