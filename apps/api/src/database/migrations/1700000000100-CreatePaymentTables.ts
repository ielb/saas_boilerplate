import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreatePaymentTables1700000000100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment_methods table
    await queryRunner.createTable(
      new Table({
        name: 'payment_methods',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'card',
              'bank_account',
              'sepa_debit',
              'ideal',
              'sofort',
              'giropay',
              'bancontact',
            ],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'expired', 'failed'],
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'stripePaymentMethodId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'stripeCustomerId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'isDefault',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'cardBrand',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'cardLast4',
            type: 'varchar',
            length: '4',
            isNullable: true,
          },
          {
            name: 'cardExpMonth',
            type: 'varchar',
            length: '2',
            isNullable: true,
          },
          {
            name: 'cardExpYear',
            type: 'varchar',
            length: '4',
            isNullable: true,
          },
          {
            name: 'bankName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'bankLast4',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'bankCountry',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'bankCurrency',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'billingDetails',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'lastUsedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
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
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create payments table
    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'paymentMethodId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'pending',
              'processing',
              'succeeded',
              'failed',
              'canceled',
              'requires_action',
              'requires_confirmation',
            ],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['one_time', 'recurring', 'refund', 'chargeback'],
            default: "'one_time'",
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'amountRefunded',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'amountCaptured',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'usd'",
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'stripePaymentIntentId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripeChargeId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripeCustomerId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripePaymentIntent',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'stripeCharge',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'failureCode',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'failureMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'processedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'canceledAt',
            type: 'timestamp',
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
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create payment_intents table
    await queryRunner.createTable(
      new Table({
        name: 'payment_intents',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'paymentId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'requires_payment_method',
              'requires_confirmation',
              'requires_action',
              'processing',
              'requires_capture',
              'canceled',
              'succeeded',
            ],
            default: "'requires_payment_method'",
            isNullable: false,
          },
          {
            name: 'captureMethod',
            type: 'enum',
            enum: ['automatic', 'manual'],
            default: "'automatic'",
            isNullable: false,
          },
          {
            name: 'confirmationMethod',
            type: 'enum',
            enum: ['automatic', 'manual'],
            default: "'automatic'",
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'amountCapturable',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'amountReceived',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'usd'",
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'receiptEmail',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'statementDescriptor',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'statementDescriptorSuffix',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'stripePaymentIntentId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'stripeCustomerId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripePaymentMethodId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripePaymentIntent',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'lastPaymentError',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'clientSecret',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'canceledAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'canceledBy',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'cancellationReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'confirmedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'capturedAt',
            type: 'timestamp',
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
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create payment_refunds table
    await queryRunner.createTable(
      new Table({
        name: 'payment_refunds',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'paymentId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'succeeded', 'failed', 'canceled'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'enum',
            enum: [
              'duplicate',
              'fraudulent',
              'requested_by_customer',
              'expired_uncollected',
              'partial_refund',
              'other',
            ],
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'usd'",
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'stripeRefundId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'stripeChargeId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripePaymentIntentId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'stripeRefund',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'failureCode',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'failureMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'refundedBy',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'processedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'canceledAt',
            type: 'timestamp',
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
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'payment_methods',
      new TableIndex({
        name: 'IDX_payment_methods_tenant_user',
        columnNames: ['tenantId', 'userId'],
      })
    );

    await queryRunner.createIndex(
      'payment_methods',
      new TableIndex({
        name: 'IDX_payment_methods_stripe_id',
        columnNames: ['stripePaymentMethodId'],
      })
    );

    await queryRunner.createIndex(
      'payment_methods',
      new TableIndex({
        name: 'IDX_payment_methods_stripe_customer',
        columnNames: ['stripeCustomerId'],
      })
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_tenant_status',
        columnNames: ['tenantId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_user_status',
        columnNames: ['userId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_stripe_intent',
        columnNames: ['stripePaymentIntentId'],
      })
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_stripe_charge',
        columnNames: ['stripeChargeId'],
      })
    );

    await queryRunner.createIndex(
      'payment_intents',
      new TableIndex({
        name: 'IDX_payment_intents_tenant_status',
        columnNames: ['tenantId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'payment_intents',
      new TableIndex({
        name: 'IDX_payment_intents_stripe_id',
        columnNames: ['stripePaymentIntentId'],
      })
    );

    await queryRunner.createIndex(
      'payment_intents',
      new TableIndex({
        name: 'IDX_payment_intents_stripe_customer',
        columnNames: ['stripeCustomerId'],
      })
    );

    await queryRunner.createIndex(
      'payment_refunds',
      new TableIndex({
        name: 'IDX_payment_refunds_tenant_status',
        columnNames: ['tenantId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'payment_refunds',
      new TableIndex({
        name: 'IDX_payment_refunds_stripe_id',
        columnNames: ['stripeRefundId'],
      })
    );

    await queryRunner.createIndex(
      'payment_refunds',
      new TableIndex({
        name: 'IDX_payment_refunds_payment',
        columnNames: ['paymentId'],
      })
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'payment_methods',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'payment_methods',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['paymentMethodId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'payment_methods',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'payment_intents',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'payment_intents',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'payment_intents',
      new TableForeignKey({
        columnNames: ['paymentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'payments',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'payment_refunds',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'payment_refunds',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'payment_refunds',
      new TableForeignKey({
        columnNames: ['paymentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'payments',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const paymentRefundsTable = await queryRunner.getTable('payment_refunds');
    const paymentRefundsForeignKeys = paymentRefundsTable?.foreignKeys || [];
    for (const foreignKey of paymentRefundsForeignKeys) {
      await queryRunner.dropForeignKey('payment_refunds', foreignKey);
    }

    const paymentIntentsTable = await queryRunner.getTable('payment_intents');
    const paymentIntentsForeignKeys = paymentIntentsTable?.foreignKeys || [];
    for (const foreignKey of paymentIntentsForeignKeys) {
      await queryRunner.dropForeignKey('payment_intents', foreignKey);
    }

    const paymentsTable = await queryRunner.getTable('payments');
    const paymentsForeignKeys = paymentsTable?.foreignKeys || [];
    for (const foreignKey of paymentsForeignKeys) {
      await queryRunner.dropForeignKey('payments', foreignKey);
    }

    const paymentMethodsTable = await queryRunner.getTable('payment_methods');
    const paymentMethodsForeignKeys = paymentMethodsTable?.foreignKeys || [];
    for (const foreignKey of paymentMethodsForeignKeys) {
      await queryRunner.dropForeignKey('payment_methods', foreignKey);
    }

    // Drop tables
    await queryRunner.dropTable('payment_refunds');
    await queryRunner.dropTable('payment_intents');
    await queryRunner.dropTable('payments');
    await queryRunner.dropTable('payment_methods');
  }
}
