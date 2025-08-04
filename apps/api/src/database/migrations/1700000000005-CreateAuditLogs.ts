import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateAuditLogs1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'eventType',
            type: 'enum',
            enum: [
              'user_registered',
              'user_login',
              'user_logout',
              'login_failed',
              'password_reset_requested',
              'password_reset_completed',
              'password_changed',
              'email_verified',
              'email_verification_sent',
              'mfa_enabled',
              'mfa_disabled',
              'mfa_verified',
              'mfa_failed',
              'backup_codes_generated',
              'backup_code_used',
              'account_recovery_initiated',
              'account_recovery_verified',
              'account_recovery_completed',
              'account_recovery_failed',
              'session_created',
              'session_refreshed',
              'session_revoked',
              'session_expired',
              'suspicious_activity',
              'brute_force_attempt',
              'rate_limit_exceeded',
              'invalid_token',
              'token_expired',
            ],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['success', 'failure', 'warning', 'info'],
            isNullable: false,
            default: "'success'",
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'critical'],
            isNullable: false,
            default: "'low'",
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'tenantId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'sessionId',
            type: 'varchar',
            length: '255',
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
            name: 'userEmail',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'targetUserId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'targetUserEmail',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'requestData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'responseData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'errorCode',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'source',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'userCountry',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'userCity',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'isSuspicious',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'requiresReview',
            type: 'boolean',
            isNullable: false,
            default: false,
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
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create indexes for performance and querying
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_eventType" ON "audit_logs" ("eventType")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_tenantId" ON "audit_logs" ("tenantId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_ipAddress" ON "audit_logs" ("ipAddress")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_eventType_createdAt" ON "audit_logs" ("eventType", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_userId_createdAt" ON "audit_logs" ("userId", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_tenantId_createdAt" ON "audit_logs" ("tenantId", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_userEmail" ON "audit_logs" ("userEmail")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_status" ON "audit_logs" ("status")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_severity" ON "audit_logs" ("severity")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_isSuspicious" ON "audit_logs" ("isSuspicious")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_requiresReview" ON "audit_logs" ("requiresReview")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_sessionId" ON "audit_logs" ("sessionId")`
    );

    // Add foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_tenantId"`
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_userId"`
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_sessionId"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_requiresReview"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_isSuspicious"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_severity"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_status"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_userEmail"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_tenantId_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_userId_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_eventType_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_ipAddress"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_tenantId"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_eventType"`);

    // Drop table
    await queryRunner.dropTable('audit_logs');
  }
}
