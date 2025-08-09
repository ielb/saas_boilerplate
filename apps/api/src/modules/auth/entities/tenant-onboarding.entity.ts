import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

import { Tenant } from './tenant.entity';
import { User } from './user.entity';

export enum OnboardingStep {
  TENANT_SETUP = 'tenant_setup',
  ADMIN_USER_CREATION = 'admin_user_creation',
  PLAN_SELECTION = 'plan_selection',
  PAYMENT_SETUP = 'payment_setup',
  FEATURE_CONFIGURATION = 'feature_configuration',
  VERIFICATION = 'verification',
  COMPLETION = 'completion',
}

export enum OnboardingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('tenant_onboarding')
@Index(['status'])
@Index(['currentStep'])
@Index(['createdAt'])
export class TenantOnboarding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  adminUserId?: string;

  @Column({
    type: 'enum',
    enum: OnboardingStep,
    default: OnboardingStep.TENANT_SETUP,
  })
  @IsEnum(OnboardingStep)
  currentStep!: OnboardingStep;

  @Column({
    type: 'enum',
    enum: OnboardingStatus,
    default: OnboardingStatus.PENDING,
  })
  @IsEnum(OnboardingStatus)
  status!: OnboardingStatus;

  @Column({ type: 'json', default: () => "'[]'" })
  completedSteps!: OnboardingStep[];

  @Column({ type: 'integer', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage!: number;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  onboardingData?: {
    tenantName?: string;
    domain?: string;
    adminUser?: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      jobTitle?: string;
      password?: string;
    };
    description?: string;
    industry?: string;
    companySize?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    timezone?: string;
    locale?: string;
    currency?: string;
    plan?: string;
    requestedFeatures?: string[];
    trialDays?: number;
    metadata?: Record<string, any>;
  };

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  verificationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  verificationTokenExpiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  verifiedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  cancelledAt?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  cancellationReason?: string;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  stepData?: Record<OnboardingStep, any>;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  errorLog?: Array<{
    step: OnboardingStep;
    error: string;
    timestamp: Date;
    retryCount: number;
  }>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  @IsOptional()
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  userAgent?: string;

  @Column({ type: 'boolean', default: true })
  sendWelcomeEmail!: boolean;

  @Column({ type: 'boolean', default: false })
  autoVerify!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  estimatedCompletion?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  nextAction?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant?: Tenant;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'adminUserId' })
  adminUser?: User;

  /**
   * Check if onboarding is completed
   */
  get isCompleted(): boolean {
    return this.status === OnboardingStatus.COMPLETED;
  }

  /**
   * Check if onboarding is in progress
   */
  get isInProgress(): boolean {
    return this.status === OnboardingStatus.IN_PROGRESS;
  }

  /**
   * Check if onboarding has failed
   */
  get hasFailed(): boolean {
    return this.status === OnboardingStatus.FAILED;
  }

  /**
   * Check if onboarding is cancelled
   */
  get isCancelled(): boolean {
    return this.status === OnboardingStatus.CANCELLED;
  }

  /**
   * Check if verification is required
   */
  get needsVerification(): boolean {
    return this.currentStep === OnboardingStep.VERIFICATION && !this.verifiedAt;
  }

  /**
   * Check if verification token is expired
   */
  get isVerificationTokenExpired(): boolean {
    return (
      !!this.verificationTokenExpiresAt &&
      this.verificationTokenExpiresAt <= new Date()
    );
  }

  /**
   * Get next step in the onboarding process
   */
  getNextStep(): OnboardingStep | null {
    const stepOrder = [
      OnboardingStep.TENANT_SETUP,
      OnboardingStep.ADMIN_USER_CREATION,
      OnboardingStep.PLAN_SELECTION,
      OnboardingStep.PAYMENT_SETUP,
      OnboardingStep.FEATURE_CONFIGURATION,
      OnboardingStep.VERIFICATION,
      OnboardingStep.COMPLETION,
    ];

    const currentIndex = stepOrder.indexOf(this.currentStep);
    if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
      return null;
    }

    return stepOrder[currentIndex + 1] || null;
  }

  /**
   * Check if step is completed
   */
  isStepCompleted(step: OnboardingStep): boolean {
    return this.completedSteps.includes(step);
  }

  /**
   * Add completed step
   */
  addCompletedStep(step: OnboardingStep): void {
    if (!this.completedSteps.includes(step)) {
      this.completedSteps.push(step);
      this.updateProgress();
    }
  }

  /**
   * Update progress percentage
   */
  updateProgress(): void {
    const totalSteps = Object.keys(OnboardingStep).length;
    this.progressPercentage = Math.round(
      (this.completedSteps.length / totalSteps) * 100
    );
  }

  /**
   * Add error to log
   */
  addError(step: OnboardingStep, error: string): void {
    if (!this.errorLog) {
      this.errorLog = [];
    }

    const existingError = this.errorLog.find(e => e.step === step);
    if (existingError) {
      existingError.retryCount += 1;
      existingError.error = error;
      existingError.timestamp = new Date();
    } else {
      this.errorLog.push({
        step,
        error,
        timestamp: new Date(),
        retryCount: 1,
      });
    }
  }

  /**
   * Get error count for step
   */
  getErrorCount(step: OnboardingStep): number {
    if (!this.errorLog) return 0;
    const error = this.errorLog.find(e => e.step === step);
    return error ? error.retryCount : 0;
  }

  /**
   * Set step data
   */
  setStepData(step: OnboardingStep, data: any): void {
    if (!this.stepData) {
      this.stepData = {} as Record<OnboardingStep, any>;
    }
    this.stepData[step] = data;
  }

  /**
   * Get step data
   */
  getStepData(step: OnboardingStep): any {
    return this.stepData?.[step];
  }

  /**
   * Cancel onboarding
   */
  cancel(reason?: string): void {
    this.status = OnboardingStatus.CANCELLED;
    this.cancelledAt = new Date();
    if (reason) {
      this.cancellationReason = reason;
    }
  }

  /**
   * Complete onboarding
   */
  complete(): void {
    this.status = OnboardingStatus.COMPLETED;
    this.currentStep = OnboardingStep.COMPLETION;
    this.completedAt = new Date();
    this.progressPercentage = 100;
    this.addCompletedStep(OnboardingStep.COMPLETION);
  }

  /**
   * Fail onboarding
   */
  fail(error: string): void {
    this.status = OnboardingStatus.FAILED;
    this.addError(this.currentStep, error);
  }
}
