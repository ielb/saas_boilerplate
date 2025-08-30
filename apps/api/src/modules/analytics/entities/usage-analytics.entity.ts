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
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export enum AnalyticsEventType {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  FEATURE_ACCESS = 'feature_access',
  API_CALL = 'api_call',
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  TEAM_CREATED = 'team_created',
  TEAM_JOINED = 'team_joined',
  DELEGATION_CREATED = 'delegation_created',
  DELEGATION_ACTIVATED = 'delegation_activated',
  INVITATION_SENT = 'invitation_sent',
  INVITATION_ACCEPTED = 'invitation_accepted',
  BULK_IMPORT = 'bulk_import',
  BULK_EXPORT = 'bulk_export',
  PAYMENT_PROCESSED = 'payment_processed',
  SUBSCRIPTION_CHANGED = 'subscription_changed',
  CUSTOM_EVENT = 'custom_event',
}

export enum AnalyticsMetricType {
  COUNT = 'count',
  DURATION = 'duration',
  SIZE = 'size',
  VALUE = 'value',
  PERCENTAGE = 'percentage',
}

@Entity('usage_analytics')
@Index(['tenantId', 'eventType', 'timestamp'])
@Index(['tenantId', 'userId', 'timestamp'])
@Index(['tenantId', 'timestamp'])
export class UsageAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({
    type: 'enum',
    enum: AnalyticsEventType,
  })
  eventType!: AnalyticsEventType;

  @Column({ type: 'varchar', length: 255 })
  eventName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: AnalyticsMetricType,
    default: AnalyticsMetricType.COUNT,
  })
  metricType!: AnalyticsMetricType;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 1 })
  metricValue!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resourceId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resourceType!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sessionId!: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'timestamp with time zone' })
  timestamp!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user!: User | null;

  // Business logic methods
  getMetricValueAsNumber(): number {
    return Number(this.metricValue);
  }

  getFormattedTimestamp(): string {
    return this.timestamp.toISOString();
  }

  getMetadataValue(key: string): any {
    return this.metadata?.[key];
  }

  hasMetadata(): boolean {
    return (
      this.metadata !== null &&
      this.metadata !== undefined &&
      Object.keys(this.metadata).length > 0
    );
  }

  isUserEvent(): boolean {
    return this.userId !== null && this.userId !== undefined;
  }

  isSystemEvent(): boolean {
    return this.userId === null || this.userId === undefined;
  }

  getEventCategory(): string {
    switch (this.eventType) {
      case AnalyticsEventType.USER_LOGIN:
      case AnalyticsEventType.USER_LOGOUT:
        return 'authentication';
      case AnalyticsEventType.FEATURE_ACCESS:
      case AnalyticsEventType.API_CALL:
        return 'usage';
      case AnalyticsEventType.FILE_UPLOAD:
      case AnalyticsEventType.FILE_DOWNLOAD:
        return 'files';
      case AnalyticsEventType.TEAM_CREATED:
      case AnalyticsEventType.TEAM_JOINED:
        return 'teams';
      case AnalyticsEventType.DELEGATION_CREATED:
      case AnalyticsEventType.DELEGATION_ACTIVATED:
        return 'delegations';
      case AnalyticsEventType.INVITATION_SENT:
      case AnalyticsEventType.INVITATION_ACCEPTED:
        return 'invitations';
      case AnalyticsEventType.BULK_IMPORT:
      case AnalyticsEventType.BULK_EXPORT:
        return 'bulk_operations';
      case AnalyticsEventType.PAYMENT_PROCESSED:
      case AnalyticsEventType.SUBSCRIPTION_CHANGED:
        return 'billing';
      default:
        return 'other';
    }
  }
}

@Entity('analytics_aggregates')
@Index(['tenantId', 'metricName', 'period', 'timestamp'])
export class AnalyticsAggregate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 255 })
  metricName!: string;

  @Column({ type: 'varchar', length: 50 })
  period!: string; // 'hour', 'day', 'week', 'month'

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalValue!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  averageValue!: number;

  @Column({ type: 'int' })
  count!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  minValue!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  maxValue!: number;

  @Column({ type: 'jsonb', nullable: true })
  breakdown!: Record<string, any> | null;

  @Column({ type: 'timestamp with time zone' })
  timestamp!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  // Business logic methods
  getTotalValueAsNumber(): number {
    return Number(this.totalValue);
  }

  getAverageValueAsNumber(): number {
    return Number(this.averageValue);
  }

  getMinValueAsNumber(): number {
    return Number(this.minValue);
  }

  getMaxValueAsNumber(): number {
    return Number(this.maxValue);
  }

  getBreakdownValue(key: string): any {
    return this.breakdown?.[key];
  }

  hasBreakdown(): boolean {
    return (
      this.breakdown !== null &&
      this.breakdown !== undefined &&
      Object.keys(this.breakdown).length > 0
    );
  }
}

@Entity('analytics_alerts')
export class AnalyticsAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  tenantId!: string;

  @Column()
  alertName!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @Column()
  metricName!: string;

  @Column({
    type: 'enum',
    enum: ['gt', 'lt', 'eq', 'gte', 'lte'],
  })
  condition!: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  threshold!: number;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  lastTriggeredAt?: Date;

  @Column({ default: 0 })
  triggerCount!: number;

  // Business logic methods
  isThresholdExceeded(value: number): boolean {
    switch (this.condition) {
      case 'gt':
        return value > this.threshold;
      case 'lt':
        return value < this.threshold;
      case 'eq':
        return value === this.threshold;
      case 'gte':
        return value >= this.threshold;
      case 'lte':
        return value <= this.threshold;
      default:
        return false;
    }
  }

  shouldTriggerAlert(): boolean {
    return this.isActive;
  }

  markAsTriggered(): void {
    this.lastTriggeredAt = new Date();
    this.triggerCount += 1;
  }
}

@Entity('analytics_reports')
export class AnalyticsReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  tenantId!: string;

  @Column()
  reportType!: string;

  @Column()
  reportName!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({
    type: 'enum',
    enum: ['json', 'csv', 'pdf', 'excel'],
    default: 'json',
  })
  format!: string;

  @Column({ nullable: true })
  downloadUrl?: string;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ nullable: true })
  fileSize?: number;

  @Column({ nullable: true })
  recordCount?: number;

  @Column({ nullable: true })
  storageKey?: string;
}
