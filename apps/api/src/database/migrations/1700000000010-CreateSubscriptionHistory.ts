import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateSubscriptionHistory1700000000010
  implements MigrationInterface
{
  name = 'CreateSubscriptionHistory1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'subscription_history',
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
            name: 'subscriptionId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'changeType',
            type: 'enum',
            enum: [
              'created',
              'upgraded',
              'downgraded',
              'canceled',
              'reactivated',
              'plan_changed',
              'price_changed',
            ],
            isNullable: false,
          },
          {
            name: 'previousAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'newAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            isNullable: false,
          },
          {
            name: 'previousPlanId',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'newPlanId',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'previousBillingCycle',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'newBillingCycle',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'changeDate',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'text',
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

    // Create indexes for performance
    await queryRunner.createIndex(
      'subscription_history',
      new TableIndex({
        name: 'IDX_subscription_history_subscription_change_date',
        columnNames: ['subscriptionId', 'changeDate'],
      })
    );

    await queryRunner.createIndex(
      'subscription_history',
      new TableIndex({
        name: 'IDX_subscription_history_tenant_change_date',
        columnNames: ['tenantId', 'changeDate'],
      })
    );

    await queryRunner.createIndex(
      'subscription_history',
      new TableIndex({
        name: 'IDX_subscription_history_change_type_date',
        columnNames: ['changeType', 'changeDate'],
      })
    );

    await queryRunner.createIndex(
      'subscription_history',
      new TableIndex({
        name: 'IDX_subscription_history_tenant_id',
        columnNames: ['tenantId'],
      })
    );

    await queryRunner.createIndex(
      'subscription_history',
      new TableIndex({
        name: 'IDX_subscription_history_subscription_id',
        columnNames: ['subscriptionId'],
      })
    );

    await queryRunner.createIndex(
      'subscription_history',
      new TableIndex({
        name: 'IDX_subscription_history_change_date',
        columnNames: ['changeDate'],
      })
    );

    // Create foreign key constraint to subscriptions table
    await queryRunner.createForeignKey(
      'subscription_history',
      new TableForeignKey({
        name: 'FK_subscription_history_subscription',
        columnNames: ['subscriptionId'],
        referencedTableName: 'subscriptions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey(
      'subscription_history',
      'FK_subscription_history_subscription'
    );

    // Drop indexes
    await queryRunner.dropIndex(
      'subscription_history',
      'IDX_subscription_history_subscription_change_date'
    );
    await queryRunner.dropIndex(
      'subscription_history',
      'IDX_subscription_history_tenant_change_date'
    );
    await queryRunner.dropIndex(
      'subscription_history',
      'IDX_subscription_history_change_type_date'
    );
    await queryRunner.dropIndex(
      'subscription_history',
      'IDX_subscription_history_tenant_id'
    );
    await queryRunner.dropIndex(
      'subscription_history',
      'IDX_subscription_history_subscription_id'
    );
    await queryRunner.dropIndex(
      'subscription_history',
      'IDX_subscription_history_change_date'
    );

    // Drop table
    await queryRunner.dropTable('subscription_history');
  }
}
