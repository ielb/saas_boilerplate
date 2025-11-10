import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

export enum SubscriptionChangeType {
  CREATED = 'created',
  UPGRADED = 'upgraded',
  DOWNGRADED = 'downgraded',
  CANCELED = 'canceled',
  REACTIVATED = 'reactivated',
  PLAN_CHANGED = 'plan_changed',
  PRICE_CHANGED = 'price_changed',
}

@Entity('subscription_history')
@Index(['subscriptionId', 'changeDate'])
@Index(['tenantId', 'changeDate'])
@Index(['changeType', 'changeDate'])
export class SubscriptionHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  tenantId!: string;

  @Column('uuid')
  @Index()
  subscriptionId!: string;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  subscription!: Subscription;

  @Column({
    type: 'enum',
    enum: SubscriptionChangeType,
  })
  changeType!: SubscriptionChangeType;

  @Column('decimal', { precision: 10, scale: 2 })
  previousAmount!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  newAmount!: number;

  @Column('varchar', { length: 3 })
  currency!: string;

  @Column('varchar', { length: 50, nullable: true })
  previousPlanId?: string;

  @Column('varchar', { length: 50, nullable: true })
  newPlanId?: string;

  @Column('varchar', { length: 20, nullable: true })
  previousBillingCycle?: string;

  @Column('varchar', { length: 20, nullable: true })
  newBillingCycle?: string;

  @Column('timestamp')
  @Index()
  changeDate!: Date;

  @Column('text', { nullable: true })
  reason?: string;

  @Column('text', { nullable: true })
  notes?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Computed properties
  get amountDifference(): number {
    return this.newAmount - this.previousAmount;
  }

  get isUpgrade(): boolean {
    return this.changeType === SubscriptionChangeType.UPGRADED ||
           (this.changeType === SubscriptionChangeType.PLAN_CHANGED && this.amountDifference > 0);
  }

  get isDowngrade(): boolean {
    return this.changeType === SubscriptionChangeType.DOWNGRADED ||
           (this.changeType === SubscriptionChangeType.PLAN_CHANGED && this.amountDifference < 0);
  }

  get monthlyAmountDifference(): number {
    const previousMonthly = this.convertToMonthlyAmount(this.previousAmount, this.previousBillingCycle);
    const newMonthly = this.convertToMonthlyAmount(this.newAmount, this.newBillingCycle);
    return newMonthly - previousMonthly;
  }

  private convertToMonthlyAmount(amount: number, billingCycle?: string): number {
    switch (billingCycle) {
      case 'yearly':
        return amount / 12;
      case 'quarterly':
        return amount / 3;
      case 'monthly':
      default:
        return amount;
    }
  }
}
