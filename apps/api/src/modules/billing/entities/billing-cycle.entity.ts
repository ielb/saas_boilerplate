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
import { BillingStatus, BillingCycle } from '@app/shared';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { Invoice } from './invoice.entity';

@Entity('billing_cycles')
@Index(['tenantId', 'startDate'])
@Index(['tenantId', 'endDate'])
@Index(['subscriptionId'])
@Index(['status'])
export class BillingCycleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid', nullable: true })
  subscriptionId?: string;

  @Column({
    type: 'enum',
    enum: BillingCycle,
    default: BillingCycle.MONTHLY,
  })
  cycleType!: BillingCycle;

  @Column({ type: 'timestamp' })
  startDate!: Date;

  @Column({ type: 'timestamp' })
  endDate!: Date;

  @Column({ type: 'timestamp' })
  billingDate!: Date;

  @Column({
    type: 'enum',
    enum: BillingStatus,
    default: BillingStatus.PENDING,
  })
  status!: BillingStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'uuid', nullable: true })
  invoiceId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription?: Subscription;

  @ManyToOne(() => Invoice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invoiceId' })
  invoice?: Invoice;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
