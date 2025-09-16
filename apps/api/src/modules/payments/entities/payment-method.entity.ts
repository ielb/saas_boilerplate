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
import { Payment } from './payment.entity';

export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
  SEPA_DEBIT = 'sepa_debit',
  IDEAL = 'ideal',
  SOFORT = 'sofort',
  GIROPAY = 'giropay',
  BANCONTACT = 'bancontact',
}

export enum PaymentMethodStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Entity('payment_methods')
@Index(['tenantId', 'userId'])
@Index(['stripePaymentMethodId'])
@Index(['stripeCustomerId'])
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
  })
  type!: PaymentMethodType;

  @Column({
    type: 'enum',
    enum: PaymentMethodStatus,
    default: PaymentMethodStatus.ACTIVE,
  })
  status!: PaymentMethodStatus;

  @Column({ type: 'varchar', length: 255 })
  stripePaymentMethodId!: string;

  @Column({ type: 'varchar', length: 255 })
  stripeCustomerId!: string;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cardBrand?: string;

  @Column({ type: 'varchar', length: 4, nullable: true })
  cardLast4?: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  cardExpMonth?: string;

  @Column({ type: 'varchar', length: 4, nullable: true })
  cardExpYear?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankLast4?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankCountry?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankCurrency?: string;

  @Column({ type: 'jsonb', nullable: true })
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date;

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

  @OneToMany(() => Payment, payment => payment.paymentMethod)
  payments!: Payment[];

  // Computed properties
  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  get isActive(): boolean {
    return this.status === PaymentMethodStatus.ACTIVE && !this.isExpired;
  }

  get displayName(): string {
    if (this.type === PaymentMethodType.CARD) {
      return `${this.cardBrand} •••• ${this.cardLast4}`;
    }
    if (this.type === PaymentMethodType.BANK_ACCOUNT) {
      return `${this.bankName} •••• ${this.bankLast4}`;
    }
    return this.type.toUpperCase();
  }

  get maskedNumber(): string {
    if (this.type === PaymentMethodType.CARD) {
      return `•••• •••• •••• ${this.cardLast4}`;
    }
    if (this.type === PaymentMethodType.BANK_ACCOUNT) {
      return `•••• ${this.bankLast4}`;
    }
    return '••••';
  }
}
