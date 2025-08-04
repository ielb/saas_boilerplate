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
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum AuditEventType {
  // Authentication Events
  USER_REGISTERED = 'user_registered',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  PASSWORD_CHANGED = 'password_changed',
  EMAIL_VERIFIED = 'email_verified',
  EMAIL_VERIFICATION_SENT = 'email_verification_sent',

  // MFA Events
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  MFA_VERIFIED = 'mfa_verified',
  MFA_FAILED = 'mfa_failed',
  BACKUP_CODES_GENERATED = 'backup_codes_generated',
  BACKUP_CODE_USED = 'backup_code_used',

  // Account Recovery Events
  ACCOUNT_RECOVERY_INITIATED = 'account_recovery_initiated',
  ACCOUNT_RECOVERY_VERIFIED = 'account_recovery_verified',
  ACCOUNT_RECOVERY_COMPLETED = 'account_recovery_completed',
  ACCOUNT_RECOVERY_FAILED = 'account_recovery_failed',

  // Session Events
  SESSION_CREATED = 'session_created',
  SESSION_REFRESHED = 'session_refreshed',
  SESSION_REVOKED = 'session_revoked',
  SESSION_EXPIRED = 'session_expired',

  // Security Events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_TOKEN = 'invalid_token',
  TOKEN_EXPIRED = 'token_expired',
}

export enum AuditEventStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  WARNING = 'warning',
  INFO = 'info',
}

export enum AuditEventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('audit_logs')
@Index(['eventType'])
@Index(['userId'])
@Index(['tenantId'])
@Index(['ipAddress'])
@Index(['createdAt'])
@Index(['eventType', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['tenantId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: AuditEventType,
    nullable: false,
  })
  @IsEnum(AuditEventType)
  eventType!: AuditEventType;

  @Column({
    type: 'enum',
    enum: AuditEventStatus,
    nullable: false,
    default: AuditEventStatus.SUCCESS,
  })
  @IsEnum(AuditEventStatus)
  status!: AuditEventStatus;

  @Column({
    type: 'enum',
    enum: AuditEventSeverity,
    nullable: false,
    default: AuditEventSeverity.LOW,
  })
  @IsEnum(AuditEventSeverity)
  severity!: AuditEventSeverity;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  userId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  targetUserEmail?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  requestData?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  responseData?: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  errorCode?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  source?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  userCountry?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  userCity?: string;

  @Column({ type: 'boolean', default: false })
  isSuspicious!: boolean;

  @Column({ type: 'boolean', default: false })
  requiresReview!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  markAsSuspicious(): void {
    this.isSuspicious = true;
    this.severity = AuditEventSeverity.HIGH;
  }

  markForReview(): void {
    this.requiresReview = true;
  }

  addMetadata(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }

  addRequestData(key: string, value: any): void {
    if (!this.requestData) {
      this.requestData = {};
    }
    this.requestData[key] = value;
  }

  addResponseData(key: string, value: any): void {
    if (!this.responseData) {
      this.responseData = {};
    }
    this.responseData[key] = value;
  }

  setError(code: string, message: string): void {
    this.errorCode = code;
    this.errorMessage = message;
    this.status = AuditEventStatus.FAILURE;
  }

  setSuccess(): void {
    this.status = AuditEventStatus.SUCCESS;
  }

  setFailure(): void {
    this.status = AuditEventStatus.FAILURE;
  }

  setWarning(): void {
    this.status = AuditEventStatus.WARNING;
  }

  setInfo(): void {
    this.status = AuditEventStatus.INFO;
  }
}
