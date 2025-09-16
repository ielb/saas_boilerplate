import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Subscription } from './subscription.entity';
import { SubscriptionBillingCycle, SubscriptionPlanType } from '@app/shared';

@Entity('subscription_plans')
@Index(['isActive', 'planType'])
@Index(['stripeProductId'], { unique: true })
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPlanType,
    default: SubscriptionPlanType.STANDARD,
  })
  planType!: SubscriptionPlanType;

  @Column({
    type: 'enum',
    enum: SubscriptionBillingCycle,
    default: SubscriptionBillingCycle.MONTHLY,
  })
  billingCycle!: SubscriptionBillingCycle;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'int', default: 1 })
  maxUsers!: number;

  @Column({ type: 'int', default: 1 })
  maxProjects!: number;

  @Column({ type: 'int', default: 0 })
  maxStorageGB!: number;

  @Column({ type: 'int', default: 0 })
  maxApiCalls!: number;

  @Column({ type: 'jsonb', nullable: true })
  features?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  limits?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  restrictions?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isPopular!: boolean;

  @Column({ type: 'boolean', default: false })
  isCustom!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeProductId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePriceId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  terms?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  // Relationships
  @OneToMany(() => Subscription, subscription => subscription.plan)
  subscriptions!: Subscription[];
}
