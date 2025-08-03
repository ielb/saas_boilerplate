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
import { User } from './user.entity';

@Entity('refresh_tokens')
@Index(['tokenId'], { unique: true })
@Index(['userId', 'isRevoked'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', unique: true })
  tokenId!: string;

  @Column({ type: 'text' })
  tokenHash!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: false })
  isRevoked!: boolean;

  @Column({ type: 'uuid', nullable: true })
  replacedByTokenId?: string;

  @Column({ type: 'uuid', nullable: true })
  replacesTokenId?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceType?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  /**
   * Check if token is valid (not expired and not revoked)
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isRevoked;
  }

  /**
   * Revoke token
   */
  revoke(): void {
    this.isRevoked = true;
  }

  /**
   * Mark as replaced by another token
   */
  markAsReplaced(newTokenId: string): void {
    this.replacedByTokenId = newTokenId;
    this.isRevoked = true;
  }

  /**
   * Set the token this token replaces
   */
  setReplacesToken(oldTokenId: string): void {
    this.replacesTokenId = oldTokenId;
  }

  /**
   * Get device information for display
   */
  getDeviceInfo(): string {
    if (this.deviceName && this.deviceType) {
      return `${this.deviceName} (${this.deviceType})`;
    }
    if (this.deviceName) {
      return this.deviceName;
    }
    if (this.userAgent) {
      return this.userAgent.substring(0, 50) + '...';
    }
    return 'Unknown device';
  }

  /**
   * Convert to JSON (exclude sensitive data)
   */
  toJSON(): any {
    return {
      id: this.id,
      tokenId: this.tokenId,
      expiresAt: this.expiresAt,
      isRevoked: this.isRevoked,
      ipAddress: this.ipAddress,
      deviceInfo: this.getDeviceInfo(),
      location: this.location,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
