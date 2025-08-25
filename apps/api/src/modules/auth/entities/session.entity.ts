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

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  SUSPICIOUS = 'suspicious',
}

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

@Entity('sessions')
@Index(['userId', 'status'])
@Index(['refreshTokenHash'])
@Index(['deviceFingerprint'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refreshTokenHash!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceFingerprint!: string | null;

  @Column({ type: 'varchar', length: 100 })
  deviceName!: string;

  @Column({ type: 'varchar', length: 50 })
  deviceType!: DeviceType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browserVersion!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  operatingSystem!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  osVersion!: string | null;

  @Column({ type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  timezone!: string | null;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.ACTIVE })
  status!: SessionStatus;

  @Column({ type: 'boolean', default: false })
  isTrusted!: boolean;

  @Column({ type: 'boolean', default: false })
  isRememberMe!: boolean;

  @Column({ type: 'timestamp' })
  lastActivityAt!: Date;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  revokedReason!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  isActive(): boolean {
    return this.status === SessionStatus.ACTIVE && this.expiresAt > new Date();
  }

  isExpired(): boolean {
    return this.expiresAt <= new Date();
  }

  revoke(reason?: string): void {
    this.status = SessionStatus.REVOKED;
    this.revokedAt = new Date();
    this.revokedReason = reason || 'Manually revoked';
  }

  markAsSuspicious(): void {
    this.status = SessionStatus.SUSPICIOUS;
  }

  updateActivity(): void {
    this.lastActivityAt = new Date();
  }

  extendExpiration(additionalMinutes: number): void {
    this.expiresAt = new Date(
      this.expiresAt.getTime() + additionalMinutes * 60 * 1000
    );
  }
}
