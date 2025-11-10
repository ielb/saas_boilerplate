import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveStripeProductIdUniqueConstraint1700000000400
  implements MigrationInterface
{
  name = 'RemoveStripeProductIdUniqueConstraint1700000000400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint on stripeProductId
    // Multiple subscription plans can share the same Stripe product
    // (e.g., different billing cycles for the same plan)
    await queryRunner.query(`
      ALTER TABLE "subscription_plans"
      DROP CONSTRAINT IF EXISTS "UQ_subscription_plans_stripe_product_id"
    `);

    // Drop the unique index if it exists (TypeORM might have created one)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_subscription_plans_stripeProductId"
    `);

    // Create a non-unique index for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subscription_plans_stripe_product_id" 
      ON "subscription_plans" ("stripeProductId")
      WHERE "stripeProductId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the non-unique index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_subscription_plans_stripe_product_id"
    `);

    // Recreate the unique constraint
    // Note: This will fail if there are duplicate stripeProductId values
    await queryRunner.query(`
      ALTER TABLE "subscription_plans"
      ADD CONSTRAINT "UQ_subscription_plans_stripe_product_id" 
      UNIQUE ("stripeProductId")
    `);
  }
}

