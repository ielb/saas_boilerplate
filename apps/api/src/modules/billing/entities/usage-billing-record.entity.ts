import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UsageBilling } from './usage-billing.entity';

@Entity('usage_billing_records')
@Index(['usageBillingId'])
@Index(['metricType'])
@Index(['metricName'])
export class UsageBillingRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  usageBillingId!: string;

  @Column({ type: 'varchar', length: 50 })
  metricType!: string;

  @Column({ type: 'varchar', length: 100 })
  metricName!: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => UsageBilling, usageBilling => usageBilling.usageRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usageBillingId' })
  usageBilling!: UsageBilling;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

