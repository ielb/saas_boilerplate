import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTenantUniqueConstraints1700000000007
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing unique indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_domain"`);

    // Create new unique indexes that exclude soft-deleted records
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_tenants_name" 
      ON "tenants" ("name") 
      WHERE "deletedAt" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_tenants_domain" 
      ON "tenants" ("domain") 
      WHERE "domain" IS NOT NULL AND "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_domain"`);

    // Recreate the original indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_tenants_name" 
      ON "tenants" ("name")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_tenants_domain" 
      ON "tenants" ("domain") 
      WHERE "domain" IS NOT NULL
    `);
  }
}
