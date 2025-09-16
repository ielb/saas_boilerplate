import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Subscription } from './subscription.entity';
import { SubscriptionUsage } from './subscription-usage.entity';
import { InvoiceStatus, InvoiceType } from '@app/shared';

@Entity('subscription_invoices')
@Index(['subscriptionId', 'status'])
@Index(['tenantId', 'status'])
@Index(['stripeInvoiceId'], { unique: true })
export class SubscriptionInvoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  subscriptionId!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 255 })
  invoiceNumber!: string;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status!: InvoiceStatus;

  @Column({
    type: 'enum',
    enum: InvoiceType,
    default: InvoiceType.SUBSCRIPTION,
  })
  type!: InvoiceType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  taxRate!: number;

  @Column({ type: 'date' })
  issueDate!: Date;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({ type: 'date', nullable: true })
  paidDate?: Date;

  @Column({ type: 'date', nullable: true })
  voidedDate?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeInvoiceId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentIntentId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCustomerId?: string;

  @Column({ type: 'jsonb', nullable: true })
  billingDetails?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  shippingDetails?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  terms?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pdfUrl?: string;

  @Column({ type: 'boolean', default: false })
  isRecurring!: boolean;

  @Column({ type: 'boolean', default: false })
  isOverdue!: boolean;

  @Column({ type: 'int', default: 0 })
  daysOverdue!: number;

  @Column({ type: 'jsonb', nullable: true })
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    metadata?: Record<string, any>;
  }>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  // Relationships
  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription!: Subscription;

  @OneToMany(() => SubscriptionUsage, usage => usage.invoice, {
    nullable: true,
  })
  usages!: SubscriptionUsage[];
}
