import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSessionFieldLengths1700000000300
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, update any NULL deviceName values to a default value
    await queryRunner.query(`
      UPDATE "sessions"
      SET "deviceName" = 'device'
      WHERE "deviceName" IS NULL
    `);

    // Update deviceName from varchar(100) to varchar(255)
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ALTER COLUMN "deviceName" TYPE varchar(255)
    `);

    // Update userAgent from varchar(100) to text (to handle long user agent strings)
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ALTER COLUMN "userAgent" TYPE text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert userAgent back to varchar(100)
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ALTER COLUMN "userAgent" TYPE varchar(100)
    `);

    // Revert deviceName back to varchar(100)
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ALTER COLUMN "deviceName" TYPE varchar(100)
    `);
  }
}

