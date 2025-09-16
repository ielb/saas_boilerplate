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
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Payment } from './payment.entity';

export enum RefundStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export enum RefundReason {
  DUPLICATE = 'duplicate',
  FRAUDULENT = 'fraudulent',
  REQUESTED_BY_CUSTOMER = 'requested_by_customer',
  EXPIRED_UNCOLLECTED = 'expired_uncollected',
  PARTIAL_REFUND = 'partial_refund',
  OTHER = 'other',
}

@Entity('payment_refunds')
@Index(['tenantId', 'status'])
@Index(['stripeRefundId'])
@Index(['paymentId'])
export class PaymentRefund {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  paymentId!: string;

  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status!: RefundStatus;

  @Column({
    type: 'enum',
    enum: RefundReason,
    nullable: true,
  })
  reason?: RefundReason;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 3, default: 'usd' })
  currency!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 255 })
  stripeRefundId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeChargeId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentIntentId?: string;

  @Column({ type: 'jsonb', nullable: true })
  stripeRefund?: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureCode?: string;

  @Column({ type: 'text', nullable: true })
  failureMessage?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refundedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  canceledAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paymentId' })
  payment!: Payment;

  // Computed properties
  get isSuccessful(): boolean {
    return this.status === RefundStatus.SUCCEEDED;
  }

  get isFailed(): boolean {
    return this.status === RefundStatus.FAILED;
  }

  get isPending(): boolean {
    return this.status === RefundStatus.PENDING;
  }

  get isCanceled(): boolean {
    return this.status === RefundStatus.CANCELED;
  }

  get isProcessed(): boolean {
    return this.processedAt !== null;
  }

  get isPartialRefund(): boolean {
    return this.reason === RefundReason.PARTIAL_REFUND;
  }

  get isFullRefund(): boolean {
    return this.payment && this.amount >= this.payment.amount;
  }

  get isFraudulent(): boolean {
    return this.reason === RefundReason.FRAUDULENT;
  }

  get isCustomerRequested(): boolean {
    return this.reason === RefundReason.REQUESTED_BY_CUSTOMER;
  }
}
