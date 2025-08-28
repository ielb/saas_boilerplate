import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamMembershipLastAccessed1700000000013
  implements MigrationInterface
{
  name = 'AddTeamMembershipLastAccessed1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "team_memberships" 
      ADD COLUMN "lastAccessedAt" TIMESTAMP NULL
    `);

    // Add index for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_team_memberships_last_accessed" 
      ON "team_memberships" ("lastAccessedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_team_memberships_last_accessed"
    `);

    await queryRunner.query(`
      ALTER TABLE "team_memberships" 
      DROP COLUMN "lastAccessedAt"
    `);
  }
}
