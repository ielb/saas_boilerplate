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
import { SubscriptionStatus, SubscriptionBillingCycle } from '@app/shared';
import { SubscriptionPlan } from './subscription-plan.entity';

@Entity('subscriptions')
@Index(['tenantId', 'status'])
@Index(['userId', 'status'])
@Index(['stripeSubscriptionId'], { unique: true })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status!: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: SubscriptionBillingCycle,
    default: SubscriptionBillingCycle.MONTHLY,
  })
  billingCycle!: SubscriptionBillingCycle;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice?: number;

  @Column({ type: 'date' })
  startDate!: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  @Column({ type: 'date', nullable: true })
  trialEndDate?: Date;

  @Column({ type: 'date', nullable: true })
  currentPeriodStart?: Date;

  @Column({ type: 'date', nullable: true })
  currentPeriodEnd?: Date;

  @Column({ type: 'date', nullable: true })
  cancelAtPeriodEnd?: Date;

  @Column({ type: 'date', nullable: true })
  canceledAt?: Date;

  @Column({ type: 'date', nullable: true })
  endedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeSubscriptionId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePriceId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeProductId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCustomerId?: string;

  @Column({ type: 'uuid', nullable: true })
  planId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  features?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  limits?: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isTrial!: boolean;

  @Column({ type: 'boolean', default: false })
  autoRenew!: boolean;

  @Column({ type: 'int', default: 0 })
  trialDays!: number;

  @Column({ type: 'int', default: 0 })
  gracePeriodDays!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancelReason?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  // Relationships
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => SubscriptionPlan, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'planId' })
  plan!: SubscriptionPlan;
}
