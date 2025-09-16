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

export enum PaymentIntentStatus {
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  REQUIRES_CAPTURE = 'requires_capture',
  CANCELED = 'canceled',
  SUCCEEDED = 'succeeded',
}

export enum PaymentIntentCaptureMethod {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
}

export enum PaymentIntentConfirmationMethod {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
}

@Entity('payment_intents')
@Index(['tenantId', 'status'])
@Index(['stripePaymentIntentId'])
@Index(['stripeCustomerId'])
export class PaymentIntent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid', nullable: true })
  paymentId?: string;

  @Column({
    type: 'enum',
    enum: PaymentIntentStatus,
    default: PaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
  })
  status!: PaymentIntentStatus;

  @Column({
    type: 'enum',
    enum: PaymentIntentCaptureMethod,
    default: PaymentIntentCaptureMethod.AUTOMATIC,
  })
  captureMethod!: PaymentIntentCaptureMethod;

  @Column({
    type: 'enum',
    enum: PaymentIntentConfirmationMethod,
    default: PaymentIntentConfirmationMethod.AUTOMATIC,
  })
  confirmationMethod!: PaymentIntentConfirmationMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountCapturable!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountReceived!: number;

  @Column({ type: 'varchar', length: 3, default: 'usd' })
  currency!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  receiptEmail?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  statementDescriptor?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  statementDescriptorSuffix?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 255 })
  stripePaymentIntentId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCustomerId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentMethodId?: string;

  @Column({ type: 'jsonb', nullable: true })
  stripePaymentIntent?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  lastPaymentError?: {
    code?: string;
    decline_code?: string;
    message?: string;
    param?: string;
    payment_method?: Record<string, any>;
    type?: string;
  };

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientSecret?: string;

  @Column({ type: 'timestamp', nullable: true })
  canceledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  canceledBy?: string;

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  capturedAt?: Date;

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

  @ManyToOne(() => Payment, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paymentId' })
  payment?: Payment;

  // Computed properties
  get isSuccessful(): boolean {
    return this.status === PaymentIntentStatus.SUCCEEDED;
  }

  get isFailed(): boolean {
    return this.status === PaymentIntentStatus.CANCELED;
  }

  get isPending(): boolean {
    return [
      PaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
      PaymentIntentStatus.REQUIRES_CONFIRMATION,
      PaymentIntentStatus.REQUIRES_ACTION,
      PaymentIntentStatus.PROCESSING,
      PaymentIntentStatus.REQUIRES_CAPTURE,
    ].includes(this.status);
  }

  get requiresAction(): boolean {
    return this.status === PaymentIntentStatus.REQUIRES_ACTION;
  }

  get requiresConfirmation(): boolean {
    return this.status === PaymentIntentStatus.REQUIRES_CONFIRMATION;
  }

  get requiresPaymentMethod(): boolean {
    return this.status === PaymentIntentStatus.REQUIRES_PAYMENT_METHOD;
  }

  get isCanceled(): boolean {
    return this.status === PaymentIntentStatus.CANCELED;
  }

  get isCapturable(): boolean {
    return this.status === PaymentIntentStatus.REQUIRES_CAPTURE;
  }

  get isProcessing(): boolean {
    return this.status === PaymentIntentStatus.PROCESSING;
  }
}
