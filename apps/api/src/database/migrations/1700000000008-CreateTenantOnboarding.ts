import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTenantOnboarding1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "onboarding_step_enum" AS ENUM (
        'tenant_setup',
        'admin_user_creation',
        'plan_selection',
        'payment_setup',
        'feature_configuration',
        'verification',
        'completion'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "onboarding_status_enum" AS ENUM (
        'pending',
        'in_progress',
        'completed',
        'failed',
        'cancelled'
      )
    `);

    // Create tenant_onboarding table
    await queryRunner.createTable(
      new Table({
        name: 'tenant_onboarding',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'adminUserId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'currentStep',
            type: 'onboarding_step_enum',
            default: "'tenant_setup'",
          },
          {
            name: 'status',
            type: 'onboarding_status_enum',
            default: "'pending'",
          },
          {
            name: 'completedSteps',
            type: 'json',
            default: "'[]'",
          },
          {
            name: 'progressPercentage',
            type: 'integer',
            default: 0,
          },
          {
            name: 'onboardingData',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'verificationToken',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'verificationTokenExpiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'verifiedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancelledAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancellationReason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'stepData',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'errorLog',
            type: 'json',
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
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sendWelcomeEmail',
            type: 'boolean',
            default: true,
          },
          {
            name: 'autoVerify',
            type: 'boolean',
            default: false,
          },
          {
            name: 'estimatedCompletion',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'nextAction',
            type: 'varchar',
            length: '500',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create indexes using raw SQL
    await queryRunner.query(
      'CREATE INDEX IDX_tenant_onboarding_status ON tenant_onboarding (status)'
    );

    await queryRunner.query(
      'CREATE INDEX IDX_tenant_onboarding_current_step ON tenant_onboarding ("currentStep")'
    );

    await queryRunner.query(
      'CREATE INDEX IDX_tenant_onboarding_created_at ON tenant_onboarding ("createdAt")'
    );

    await queryRunner.query(
      'CREATE INDEX IDX_tenant_onboarding_tenant_id ON tenant_onboarding ("tenantId")'
    );

    await queryRunner.query(
      'CREATE INDEX IDX_tenant_onboarding_admin_user_id ON tenant_onboarding ("adminUserId")'
    );

    await queryRunner.query(
      'CREATE INDEX IDX_tenant_onboarding_verification_token ON tenant_onboarding ("verificationToken")'
    );

    // Create foreign keys using raw SQL
    await queryRunner.query(`
      ALTER TABLE tenant_onboarding
      ADD CONSTRAINT FK_tenant_onboarding_tenant
      FOREIGN KEY ("tenantId") REFERENCES tenants(id)
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE tenant_onboarding
      ADD CONSTRAINT FK_tenant_onboarding_admin_user
      FOREIGN KEY ("adminUserId") REFERENCES users(id)
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('tenant_onboarding');
    if (table) {
      const tenantForeignKey = table.foreignKeys.find(
        fk => fk.columnNames.indexOf('tenantId') !== -1
      );
      if (tenantForeignKey) {
        await queryRunner.dropForeignKey('tenant_onboarding', tenantForeignKey);
      }

      const userForeignKey = table.foreignKeys.find(
        fk => fk.columnNames.indexOf('adminUserId') !== -1
      );
      if (userForeignKey) {
        await queryRunner.dropForeignKey('tenant_onboarding', userForeignKey);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex(
      'tenant_onboarding',
      'IDX_tenant_onboarding_status'
    );
    await queryRunner.dropIndex(
      'tenant_onboarding',
      'IDX_tenant_onboarding_current_step'
    );
    await queryRunner.dropIndex(
      'tenant_onboarding',
      'IDX_tenant_onboarding_created_at'
    );
    await queryRunner.dropIndex(
      'tenant_onboarding',
      'IDX_tenant_onboarding_tenant_id'
    );
    await queryRunner.dropIndex(
      'tenant_onboarding',
      'IDX_tenant_onboarding_admin_user_id'
    );
    await queryRunner.dropIndex(
      'tenant_onboarding',
      'IDX_tenant_onboarding_verification_token'
    );

    // Drop table
    await queryRunner.dropTable('tenant_onboarding');

    // Drop enum types
    await queryRunner.query(`DROP TYPE "onboarding_step_enum"`);
    await queryRunner.query(`DROP TYPE "onboarding_status_enum"`);
  }
}
