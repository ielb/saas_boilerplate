import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionTables1700000000200
  implements MigrationInterface
{
  name = 'CreateSubscriptionTables1700000000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create subscription_plans table
    await queryRunner.query(`
      CREATE TYPE "subscription_plan_type_enum" AS ENUM (
        'free', 'basic', 'standard', 'premium', 'enterprise', 'custom'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "subscription_billing_cycle_enum" AS ENUM (
        'daily', 'weekly', 'monthly', 'quarterly', 'semi_annually', 'annually', 'custom'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "plan_type" "subscription_plan_type_enum" NOT NULL DEFAULT 'standard',
        "billing_cycle" "subscription_billing_cycle_enum" NOT NULL DEFAULT 'monthly',
        "price" decimal(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "max_users" integer NOT NULL DEFAULT 1,
        "max_projects" integer NOT NULL DEFAULT 1,
        "max_storage_gb" integer NOT NULL DEFAULT 0,
        "max_api_calls" integer NOT NULL DEFAULT 0,
        "features" jsonb,
        "limits" jsonb,
        "restrictions" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_popular" boolean NOT NULL DEFAULT false,
        "is_custom" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "stripeProductId" character varying(255),
        "stripePriceId" character varying(255),
        "metadata" jsonb,
        "terms" text,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_subscription_plans" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscription_plans_stripe_product_id" UNIQUE ("stripeProductId")
      )
    `);

    // Create subscriptions table
    await queryRunner.query(`
      CREATE TYPE "subscription_status_enum" AS ENUM (
        'active', 'inactive', 'trial', 'expired', 'canceled', 'past_due', 'unpaid', 'suspended', 'pending', 'completed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "planId" uuid,
        "name" character varying(255) NOT NULL,
        "description" text,
        "status" "subscription_status_enum" NOT NULL DEFAULT 'active',
        "billingCycle" "subscription_billing_cycle_enum" NOT NULL DEFAULT 'monthly',
        "amount" decimal(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "quantity" integer NOT NULL DEFAULT 1,
        "unitPrice" decimal(10,2),
        "startDate" date NOT NULL,
        "endDate" date,
        "trialEndDate" date,
        "currentPeriodStart" date,
        "currentPeriodEnd" date,
        "cancelAtPeriodEnd" date,
        "canceledAt" date,
        "endedAt" date,
        "stripeSubscriptionId" character varying(255),
        "stripePriceId" character varying(255),
        "stripeProductId" character varying(255),
        "stripeCustomerId" character varying(255),
        "metadata" jsonb,
        "features" jsonb,
        "limits" jsonb,
        "isActive" boolean NOT NULL DEFAULT false,
        "isTrial" boolean NOT NULL DEFAULT false,
        "autoRenew" boolean NOT NULL DEFAULT false,
        "trialDays" integer NOT NULL DEFAULT 0,
        "gracePeriodDays" integer NOT NULL DEFAULT 0,
        "cancelReason" character varying(255),
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscriptions_stripe_subscription_id" UNIQUE ("stripeSubscriptionId")
      )
    `);

    // Create subscription_usages table
    await queryRunner.query(`
      CREATE TYPE "usage_metric_type_enum" AS ENUM (
        'users', 'projects', 'storage', 'api_calls', 'features', 'custom'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "subscription_usages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subscriptionId" uuid NOT NULL,
        "tenantId" uuid NOT NULL,
        "metricType" "usage_metric_type_enum" NOT NULL,
        "metricName" character varying(255) NOT NULL,
        "metricDescription" text,
        "quantity" decimal(15,4) NOT NULL DEFAULT 0,
        "unitPrice" decimal(10,2),
        "totalAmount" decimal(10,2) NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "recordedAt" TIMESTAMP NOT NULL,
        "metadata" jsonb,
        "tags" jsonb,
        "isBilled" boolean NOT NULL DEFAULT false,
        "billedAt" TIMESTAMP,
        "invoiceId" uuid,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscription_usages" PRIMARY KEY ("id")
      )
    `);

    // Create subscription_invoices table
    await queryRunner.query(`
      CREATE TYPE "invoice_status_enum" AS ENUM (
        'draft', 'pending', 'paid', 'voided', 'overdue', 'partially_paid', 'uncollectible'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "invoice_type_enum" AS ENUM (
        'subscription', 'usage', 'one_time', 'credit', 'refund'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "subscription_invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subscriptionId" uuid NOT NULL,
        "tenantId" uuid NOT NULL,
        "invoiceNumber" character varying(255) NOT NULL,
        "status" "invoice_status_enum" NOT NULL DEFAULT 'draft',
        "type" "invoice_type_enum" NOT NULL DEFAULT 'subscription',
        "subtotal" decimal(10,2) NOT NULL DEFAULT 0,
        "taxAmount" decimal(10,2) NOT NULL DEFAULT 0,
        "discountAmount" decimal(10,2) NOT NULL DEFAULT 0,
        "totalAmount" decimal(10,2) NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "taxRate" decimal(5,4) NOT NULL DEFAULT 0,
        "issueDate" date NOT NULL,
        "dueDate" date NOT NULL,
        "paidDate" date,
        "voidedDate" date,
        "stripeInvoiceId" character varying(255),
        "stripePaymentIntentId" character varying(255),
        "stripeCustomerId" character varying(255),
        "billingDetails" jsonb,
        "shippingDetails" jsonb,
        "metadata" jsonb,
        "notes" text,
        "terms" text,
        "pdfUrl" character varying(255),
        "isRecurring" boolean NOT NULL DEFAULT false,
        "isOverdue" boolean NOT NULL DEFAULT false,
        "daysOverdue" integer NOT NULL DEFAULT 0,
        "lineItems" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_subscription_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscription_invoices_stripe_invoice_id" UNIQUE ("stripeInvoiceId")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_subscription_plans_is_active_plan_type" ON "subscription_plans" ("isActive", "plan_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_tenant_id_status" ON "subscriptions" ("tenantId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_user_id_status" ON "subscriptions" ("userId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_subscription_usages_subscription_id_metric_type_period_start" ON "subscription_usages" ("subscriptionId", "metricType", "periodStart")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_subscription_usages_tenant_id_metric_type_period_start" ON "subscription_usages" ("tenantId", "metricType", "periodStart")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_subscription_invoices_subscription_id_status" ON "subscription_invoices" ("subscriptionId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_subscription_invoices_tenant_id_status" ON "subscription_invoices" ("tenantId", "status")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_tenant_id" 
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_user_id" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_plan_id" 
      FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "subscription_usages" ADD CONSTRAINT "FK_subscription_usages_subscription_id" 
      FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "subscription_invoices" ADD CONSTRAINT "FK_subscription_invoices_subscription_id" 
      FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "subscription_invoices" DROP CONSTRAINT "FK_subscription_invoices_subscription_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "subscription_usages" DROP CONSTRAINT "FK_subscription_usages_subscription_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_subscriptions_plan_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_subscriptions_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_subscriptions_tenant_id"
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "IDX_subscription_invoices_tenant_id_status"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_subscription_invoices_subscription_id_status"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_subscription_usages_tenant_id_metric_type_period_start"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_subscription_usages_subscription_id_metric_type_period_start"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_subscriptions_user_id_status"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_subscriptions_tenant_id_status"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_subscription_plans_is_active_plan_type"
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE "subscription_invoices"`);
    await queryRunner.query(`DROP TABLE "subscription_usages"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TABLE "subscription_plans"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "invoice_type_enum"`);
    await queryRunner.query(`DROP TYPE "invoice_status_enum"`);
    await queryRunner.query(`DROP TYPE "usage_metric_type_enum"`);
    await queryRunner.query(`DROP TYPE "subscription_status_enum"`);
    await queryRunner.query(`DROP TYPE "subscription_billing_cycle_enum"`);
    await queryRunner.query(`DROP TYPE "subscription_plan_type_enum"`);
  }
}
