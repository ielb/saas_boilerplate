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
import { Subscription } from './subscription.entity';
import { SubscriptionInvoice } from './subscription-invoice.entity';
import { UsageMetricType } from '@app/shared';

@Entity('subscription_usages')
@Index(['subscriptionId', 'metricType', 'periodStart'])
@Index(['tenantId', 'metricType', 'periodStart'])
export class SubscriptionUsage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  subscriptionId!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({
    type: 'enum',
    enum: UsageMetricType,
  })
  metricType!: UsageMetricType;

  @Column({ type: 'varchar', length: 255 })
  metricName!: string;

  @Column({ type: 'text', nullable: true })
  metricDescription?: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'date' })
  periodStart!: Date;

  @Column({ type: 'date' })
  periodEnd!: Date;

  @Column({ type: 'timestamp' })
  recordedAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  tags?: Record<string, string>;

  @Column({ type: 'boolean', default: false })
  isBilled!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  billedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  invoiceId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription!: Subscription;

  @ManyToOne(() => SubscriptionInvoice, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'invoiceId' })
  invoice!: SubscriptionInvoice;
}
