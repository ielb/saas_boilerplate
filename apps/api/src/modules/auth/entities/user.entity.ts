import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Exclude } from 'class-transformer';
import * as argon2 from 'argon2';

import { UserRole, UserStatus, AuthProvider } from '@app/shared';
import { Tenant } from './tenant.entity';

@Entity('users')
@Index(['email', 'tenantId'], { unique: true })
@Index(['tenantId'])
@Index(['status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude()
  password?: string;

  @Column({ type: 'varchar', length: 100 })
  @IsNotEmpty()
  @MinLength(2)
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  @IsNotEmpty()
  @MinLength(2)
  lastName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  avatar?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.MEMBER })
  @IsEnum(UserRole)
  role!: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  @IsEnum(UserStatus)
  status!: UserStatus;

  @Column({ type: 'uuid' })
  @IsNotEmpty()
  tenantId!: string;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  @IsEnum(AuthProvider)
  authProvider!: AuthProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  externalId?: string;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  emailVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  emailVerifiedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude()
  emailVerificationToken?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  emailVerificationTokenExpiresAt?: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude()
  passwordResetToken?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  passwordResetTokenExpiresAt?: Date | null;

  // MFA (Two-Factor Authentication) fields
  @Column({ type: 'text', nullable: true })
  twoFactorSecret?: string | null;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  twoFactorVerified!: boolean;

  @Column({ type: 'json', nullable: true })
  backupCodes?: string[] | null;

  @Column({ type: 'timestamp', nullable: true })
  twoFactorEnabledAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastTwoFactorAttempt?: Date | null;

  @Column({ type: 'int', default: 0 })
  twoFactorAttempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  lastLoginAt?: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  @IsOptional()
  lastLoginIp?: string;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  preferences?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => Tenant, tenant => tenant.users)
  @JoinColumn({ name: 'tenantId' })
  tenant?: Tenant;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password && this.password.length > 0) {
      // Only hash if password has changed (not already hashed)
      if (!this.password.startsWith('$argon2')) {
        this.password = await argon2.hash(this.password);
      }
    }
  }

  /**
   * Verify password against stored hash
   */
  async verifyPassword(password: string): Promise<boolean> {
    if (!this.password) {
      return false;
    }
    return argon2.verify(this.password, password);
  }

  /**
   * Get full name
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Check if user is active
   */
  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  /**
   * Check if user is admin or owner
   */
  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.OWNER;
  }

  /**
   * Check if user is owner
   */
  get isOwner(): boolean {
    return this.role === UserRole.OWNER;
  }

  /**
   * Check if user can be deleted
   */
  get canBeDeleted(): boolean {
    return this.role !== UserRole.OWNER;
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(): void {
    this.emailVerificationToken = this.generateSecureToken();
    this.emailVerificationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ); // 24 hours
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(): void {
    this.passwordResetToken = this.generateSecureToken();
    this.passwordResetTokenExpiresAt = new Date(
      Date.now() + 1 * 60 * 60 * 1000
    ); // 1 hour
  }

  /**
   * Mark email as verified
   */
  markEmailAsVerified(): void {
    this.emailVerified = true;
    this.emailVerifiedAt = new Date();
    this.emailVerificationToken = null;
    this.emailVerificationTokenExpiresAt = null;
    this.status = UserStatus.ACTIVE;
  }

  /**
   * Update last login information
   */
  updateLastLogin(ipAddress?: string): void {
    this.lastLoginAt = new Date();
    if (ipAddress) {
      this.lastLoginIp = ipAddress;
    }
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * Check if email verification token is valid
   */
  isEmailVerificationTokenValid(): boolean {
    return !!(
      this.emailVerificationToken &&
      this.emailVerificationTokenExpiresAt &&
      this.emailVerificationTokenExpiresAt > new Date()
    );
  }

  /**
   * Check if password reset token is valid
   */
  isPasswordResetTokenValid(): boolean {
    return !!(
      this.passwordResetToken &&
      this.passwordResetTokenExpiresAt &&
      this.passwordResetTokenExpiresAt > new Date()
    );
  }

  /**
   * Clear sensitive data for API responses
   */
  toJSON(): any {
    const obj = { ...this };
    delete obj.password;
    delete obj.emailVerificationToken;
    delete obj.passwordResetToken;
    delete obj.twoFactorSecret;
    delete obj.backupCodes;
    return obj;
  }
}
