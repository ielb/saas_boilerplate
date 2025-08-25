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
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

import { User } from './user.entity';

@Entity('account_recoveries')
@Index(['recoveryToken'], { unique: true })
@Index(['recoverySessionToken'], { unique: true })
@Index(['userId'])
@Index(['expiresAt'])
export class AccountRecovery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsNotEmpty()
  recoveryToken!: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsNotEmpty()
  recoverySessionToken!: string;

  @Column({ type: 'timestamp' })
  @IsNotEmpty()
  expiresAt!: Date;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'int', default: 3 })
  maxAttempts!: number;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isCompleted!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  completedAt?: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  @IsOptional()
  ipAddress?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  userAgent?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  user?: User;

  /**
   * Check if the recovery session is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if the recovery session has exceeded max attempts
   */
  hasExceededAttempts(): boolean {
    return this.attempts >= this.maxAttempts;
  }

  /**
   * Check if the recovery session is valid (not expired and not exceeded attempts)
   */
  isValid(): boolean {
    return (
      !this.isExpired() && !this.hasExceededAttempts() && !this.isCompleted
    );
  }

  /**
   * Increment attempt counter
   */
  incrementAttempts(): void {
    this.attempts += 1;
  }

  /**
   * Mark recovery as completed
   */
  markCompleted(): void {
    this.isCompleted = true;
    this.completedAt = new Date();
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(): number {
    return Math.max(0, this.maxAttempts - this.attempts);
  }
}
