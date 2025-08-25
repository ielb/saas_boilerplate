import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';

import { Tenant } from './tenant.entity';

export enum TenantUsageMetric {
  API_CALLS = 'api_calls',
  STORAGE_BYTES = 'storage_bytes',
  USERS = 'users',
  EMAILS_SENT = 'emails_sent',
  FILES_UPLOADED = 'files_uploaded',
  DATABASE_QUERIES = 'database_queries',
  WEBSOCKET_CONNECTIONS = 'websocket_connections',
  BACKGROUND_JOBS = 'background_jobs',
}

@Entity('tenant_usage')
@Index(['tenantId', 'date', 'metric'], { unique: true })
@Index(['tenantId'])
@Index(['date'])
@Index(['metric'])
export class TenantUsage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @IsNotEmpty()
  tenantId!: string;

  @Column({ type: 'date' })
  @IsDateString()
  date!: Date;

  @Column({
    type: 'enum',
    enum: TenantUsageMetric,
  })
  @IsNotEmpty()
  metric!: TenantUsageMetric;

  @Column({ type: 'integer', default: 0 })
  @IsNumber()
  value!: number;

  @Column({ type: 'integer', default: 0 })
  @IsNumber()
  limit!: number;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Tenant, tenant => tenant.id)
  @JoinColumn({ name: 'tenantId' })
  tenant?: Tenant;

  /**
   * Check if usage is over limit
   */
  get isOverLimit(): boolean {
    return this.limit > 0 && this.value > this.limit;
  }

  /**
   * Get usage percentage
   */
  get usagePercentage(): number {
    if (this.limit === 0) return 0;
    return Math.round((this.value / this.limit) * 100);
  }

  /**
   * Get remaining usage
   */
  get remainingUsage(): number {
    if (this.limit === 0) return -1; // Unlimited
    return Math.max(0, this.limit - this.value);
  }

  /**
   * Check if usage is critical (over 90%)
   */
  get isCritical(): boolean {
    return this.usagePercentage >= 90;
  }

  /**
   * Check if usage is warning (over 75%)
   */
  get isWarning(): boolean {
    return this.usagePercentage >= 75;
  }
}
