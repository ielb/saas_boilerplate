import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import {
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsBoolean,
  IsUrl,
} from 'class-validator';

import { User } from './user.entity';

@Entity('tenants')
@Index(['name'], { unique: true })
@Index(['domain'], { unique: true, where: '"domain" IS NOT NULL' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsUrl()
  domain?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  logo?: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  @IsOptional()
  primaryColor?: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  @IsOptional()
  secondaryColor?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  contactEmail?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  contactPhone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  address?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  state?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  postalCode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  country?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  timezone?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  @IsOptional()
  locale?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  currency?: string;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  verifiedAt?: Date;

  @Column({ type: 'varchar', length: 50, default: 'free' })
  @IsNotEmpty()
  plan!: string;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  planExpiresAt?: Date;

  @Column({ type: 'integer', default: 0 })
  @IsOptional()
  maxUsers!: number;

  @Column({ type: 'integer', default: 0 })
  @IsOptional()
  maxStorage!: number;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  features?: string[];

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  settings?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  trialEndsAt?: Date;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  trialExpired!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  stripeCustomerId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  stripeSubscriptionId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @OneToMany(() => User, user => user.tenantId)
  users?: User[];

  /**
   * Check if tenant is in trial
   */
  get isInTrial(): boolean {
    return (
      !!this.trialEndsAt && this.trialEndsAt > new Date() && !this.trialExpired
    );
  }

  /**
   * Check if tenant trial has expired
   */
  get hasTrialExpired(): boolean {
    return !!this.trialEndsAt && this.trialEndsAt <= new Date();
  }

  /**
   * Check if tenant has active subscription
   */
  get hasActiveSubscription(): boolean {
    return !!this.stripeSubscriptionId && this.plan !== 'free';
  }

  /**
   * Check if tenant can add more users
   */
  canAddUser(currentUserCount: number): boolean {
    if (this.maxUsers === 0) return true; // Unlimited
    return currentUserCount < this.maxUsers;
  }

  /**
   * Check if feature is enabled
   */
  hasFeature(feature: string): boolean {
    return this.features?.includes(feature) || false;
  }

  /**
   * Get setting value
   */
  getSetting(key: string, defaultValue?: any): any {
    return this.settings?.[key] ?? defaultValue;
  }

  /**
   * Set setting value
   */
  setSetting(key: string, value: any): void {
    if (!this.settings) {
      this.settings = {};
    }
    this.settings[key] = value;
  }

  /**
   * Get display name
   */
  get displayName(): string {
    return this.name;
  }

  /**
   * Get full address
   */
  get fullAddress(): string {
    const parts = [
      this.address,
      this.city,
      this.state,
      this.postalCode,
      this.country,
    ];
    return parts.filter(Boolean).join(', ');
  }
}
