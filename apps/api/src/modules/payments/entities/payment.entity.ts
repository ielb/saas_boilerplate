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
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { PaymentMethod } from './payment-method.entity';
import { PaymentRefund } from './payment-refund.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REQUIRES_ACTION = 'requires_action',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
}

export enum PaymentType {
  ONE_TIME = 'one_time',
  RECURRING = 'recurring',
  REFUND = 'refund',
  CHARGEBACK = 'chargeback',
}

@Entity('payments')
@Index(['tenantId', 'status'])
@Index(['userId', 'status'])
@Index(['stripePaymentIntentId'])
@Index(['stripeChargeId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid', nullable: true })
  paymentMethodId?: string;

  @Column({ type: 'uuid', nullable: true })
  invoiceId?: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.ONE_TIME,
  })
  type!: PaymentType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountRefunded!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountCaptured!: number;

  @Column({ type: 'varchar', length: 3, default: 'usd' })
  currency!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentIntentId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeChargeId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCustomerId?: string;

  @Column({ type: 'jsonb', nullable: true })
  stripePaymentIntent?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  stripeCharge?: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureCode?: string;

  @Column({ type: 'text', nullable: true })
  failureMessage?: string;

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

  @ManyToOne(() => PaymentMethod, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paymentMethodId' })
  paymentMethod?: PaymentMethod;

  @OneToMany(() => PaymentRefund, refund => refund.payment)
  refunds!: PaymentRefund[];

  @ManyToOne('Invoice', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invoiceId' })
  invoice?: any;

  // Computed properties
  get isSuccessful(): boolean {
    return this.status === PaymentStatus.SUCCEEDED;
  }

  get isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  get isPending(): boolean {
    return this.status === PaymentStatus.PENDING;
  }

  get isProcessing(): boolean {
    return this.status === PaymentStatus.PROCESSING;
  }

  get isCanceled(): boolean {
    return this.status === PaymentStatus.CANCELED;
  }

  get requiresAction(): boolean {
    return this.status === PaymentStatus.REQUIRES_ACTION;
  }

  get netAmount(): number {
    return this.amount - this.amountRefunded;
  }

  get refundableAmount(): number {
    return this.amountCaptured - this.amountRefunded;
  }
}
