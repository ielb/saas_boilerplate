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
import { LineItemType } from '@app/shared';
import { Invoice } from './invoice.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { SubscriptionUsage } from '../../subscriptions/entities/subscription-usage.entity';

@Entity('invoice_line_items')
@Index(['invoiceId'])
@Index(['subscriptionId'])
@Index(['usageRecordId'])
export class InvoiceLineItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  invoiceId!: string;

  @Column({
    type: 'enum',
    enum: LineItemType,
    default: LineItemType.SUBSCRIPTION,
  })
  type!: LineItemType;

  @Column({ type: 'varchar', length: 500 })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 1 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  taxRate?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  subscriptionId?: string;

  @Column({ type: 'uuid', nullable: true })
  usageRecordId?: string;

  @Column({ type: 'timestamp', nullable: true })
  periodStart?: Date;

  @Column({ type: 'timestamp', nullable: true })
  periodEnd?: Date;

  @ManyToOne(() => Invoice, invoice => invoice.lineItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoiceId' })
  invoice!: Invoice;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription?: Subscription;

  @ManyToOne(() => SubscriptionUsage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'usageRecordId' })
  usageRecord?: SubscriptionUsage;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
