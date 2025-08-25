import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { validate as validateUUID } from 'uuid';
import * as crypto from 'crypto';

import {
  TenantOnboarding,
  OnboardingStep,
  OnboardingStatus,
} from '../entities/tenant-onboarding.entity';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { UserRole, AuthProvider, UserStatus } from '@app/shared';
import { TenantService } from './tenant.service';
import { AuthService } from '../../auth/services/auth.service';
import { EmailService } from '../../email/services/email.service';
import {
  TenantOnboardingDto,
  OnboardingStepUpdateDto,
  OnboardingProgressDto,
  VerifyOnboardingDto,
  ResendVerificationDto,
  CancelOnboardingDto,
  OnboardingResponseDto,
} from '../dto/tenant-onboarding.dto';

export interface OnboardingStepResult {
  success: boolean;
  data?: any;
  error?: string;
  nextStep?: OnboardingStep;
}

@Injectable()
export class TenantOnboardingService {
  private readonly logger = new Logger(TenantOnboardingService.name);
  private readonly verificationTokenExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    @InjectRepository(TenantOnboarding)
    private readonly onboardingRepository: Repository<TenantOnboarding>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tenantService: TenantService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Start tenant onboarding workflow
   */
  async startOnboarding(
    onboardingDto: TenantOnboardingDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<OnboardingResponseDto> {
    this.logger.log(`Starting onboarding for tenant: ${onboardingDto.name}`);

    // Check if tenant name or domain already exists
    await this.validateTenantUniqueness(
      onboardingDto.name,
      onboardingDto.domain
    );

    // Check if admin user email already exists
    await this.validateAdminUserUniqueness(onboardingDto.adminUser.email);

    const onboarding = new TenantOnboarding();
    onboarding.currentStep = OnboardingStep.TENANT_SETUP;
    onboarding.status = OnboardingStatus.IN_PROGRESS;
    onboarding.onboardingData = {
      tenantName: onboardingDto.name,
      ...(onboardingDto.domain && { domain: onboardingDto.domain }),
      adminUser: onboardingDto.adminUser,
      ...(onboardingDto.description && {
        description: onboardingDto.description,
      }),
      ...(onboardingDto.industry && { industry: onboardingDto.industry }),
      ...(onboardingDto.companySize && {
        companySize: onboardingDto.companySize,
      }),
      ...(onboardingDto.contactEmail && {
        contactEmail: onboardingDto.contactEmail,
      }),
      ...(onboardingDto.contactPhone && {
        contactPhone: onboardingDto.contactPhone,
      }),
      ...(onboardingDto.address && { address: onboardingDto.address }),
      ...(onboardingDto.city && { city: onboardingDto.city }),
      ...(onboardingDto.state && { state: onboardingDto.state }),
      ...(onboardingDto.postalCode && { postalCode: onboardingDto.postalCode }),
      ...(onboardingDto.country && { country: onboardingDto.country }),
      ...(onboardingDto.timezone && { timezone: onboardingDto.timezone }),
      ...(onboardingDto.locale && { locale: onboardingDto.locale }),
      ...(onboardingDto.currency && { currency: onboardingDto.currency }),
      ...(onboardingDto.plan && { plan: onboardingDto.plan }),
      ...(onboardingDto.requestedFeatures && {
        requestedFeatures: onboardingDto.requestedFeatures,
      }),
      ...(onboardingDto.trialDays && { trialDays: onboardingDto.trialDays }),
      ...(onboardingDto.metadata && { metadata: onboardingDto.metadata }),
    };
    onboarding.sendWelcomeEmail = onboardingDto.sendWelcomeEmail ?? true;
    onboarding.autoVerify = onboardingDto.autoVerify ?? false;
    if (ipAddress) onboarding.ipAddress = ipAddress;
    if (userAgent) onboarding.userAgent = userAgent;
    onboarding.estimatedCompletion = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    onboarding.nextAction = 'Starting tenant setup...';

    const savedOnboarding = await this.onboardingRepository.save(onboarding);

    // Start the workflow
    await this.processNextStep(savedOnboarding.id);

    return this.mapToResponseDto(
      await this.getOnboardingById(savedOnboarding.id)
    );
  }

  /**
   * Process the next step in the onboarding workflow
   */
  async processNextStep(onboardingId: string): Promise<OnboardingStepResult> {
    const onboarding = await this.getOnboardingById(onboardingId);

    if (onboarding.isCompleted || onboarding.isCancelled) {
      return {
        success: false,
        error: 'Onboarding is already completed or cancelled',
      };
    }

    try {
      let result: OnboardingStepResult;

      switch (onboarding.currentStep) {
        case OnboardingStep.TENANT_SETUP:
          result = await this.processTenantSetup(onboarding);
          break;
        case OnboardingStep.ADMIN_USER_CREATION:
          result = await this.processAdminUserCreation(onboarding);
          break;
        case OnboardingStep.PLAN_SELECTION:
          result = await this.processPlanSelection(onboarding);
          break;
        case OnboardingStep.PAYMENT_SETUP:
          result = await this.processPaymentSetup(onboarding);
          break;
        case OnboardingStep.FEATURE_CONFIGURATION:
          result = await this.processFeatureConfiguration(onboarding);
          break;
        case OnboardingStep.VERIFICATION:
          result = await this.processVerification(onboarding);
          break;
        case OnboardingStep.COMPLETION:
          result = await this.processCompletion(onboarding);
          break;
        default:
          result = {
            success: false,
            error: `Unknown step: ${onboarding.currentStep}`,
          };
      }

      if (result.success && result.nextStep) {
        onboarding.addCompletedStep(onboarding.currentStep);
        onboarding.currentStep = result.nextStep;
        onboarding.setStepData(onboarding.currentStep, result.data);

        if (result.nextStep === OnboardingStep.COMPLETION) {
          onboarding.complete();
        }

        await this.onboardingRepository.save(onboarding);

        // Continue to next step if not waiting for user action
        if (result.nextStep !== OnboardingStep.VERIFICATION) {
          return await this.processNextStep(onboardingId);
        }
      } else if (!result.success) {
        onboarding.fail(result.error || 'Unknown error occurred');
        await this.onboardingRepository.save(onboarding);
      }

      return result;
    } catch (error: any) {
      this.logger.error(
        `Error processing step ${onboarding.currentStep}:`,
        error
      );
      onboarding.fail(error.message);
      await this.onboardingRepository.save(onboarding);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process tenant setup step
   */
  private async processTenantSetup(
    onboarding: TenantOnboarding
  ): Promise<OnboardingStepResult> {
    this.logger.log(`Processing tenant setup for onboarding: ${onboarding.id}`);

    const onboardingData = onboarding.onboardingData!;
    const trialEndsAt =
      onboardingData.trialDays && onboardingData.trialDays > 0
        ? new Date(Date.now() + onboardingData.trialDays * 24 * 60 * 60 * 1000)
        : undefined;

    try {
      const createTenantDto: any = {
        name: onboardingData.tenantName!,
        plan: onboardingData.plan || 'free',
        trialEndsAt,
        isActive: true,
        metadata: {
          ...onboardingData.metadata,
          onboardingId: onboarding.id,
          industry: onboardingData.industry,
          companySize: onboardingData.companySize,
        },
      };

      if (onboardingData.domain) createTenantDto.domain = onboardingData.domain;
      if (onboardingData.description)
        createTenantDto.description = onboardingData.description;
      if (onboardingData.contactEmail)
        createTenantDto.contactEmail = onboardingData.contactEmail;
      if (onboardingData.contactPhone)
        createTenantDto.contactPhone = onboardingData.contactPhone;
      if (onboardingData.address)
        createTenantDto.address = onboardingData.address;
      if (onboardingData.city) createTenantDto.city = onboardingData.city;
      if (onboardingData.state) createTenantDto.state = onboardingData.state;
      if (onboardingData.postalCode)
        createTenantDto.postalCode = onboardingData.postalCode;
      if (onboardingData.country)
        createTenantDto.country = onboardingData.country;
      if (onboardingData.timezone)
        createTenantDto.timezone = onboardingData.timezone;
      if (onboardingData.locale) createTenantDto.locale = onboardingData.locale;
      if (onboardingData.currency)
        createTenantDto.currency = onboardingData.currency;

      const tenant = await this.tenantService.createTenant(createTenantDto);

      onboarding.tenantId = tenant.id;
      onboarding.nextAction = 'Creating admin user account...';

      return {
        success: true,
        data: { tenantId: tenant.id },
        nextStep: OnboardingStep.ADMIN_USER_CREATION,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to create tenant: ${error.message}`,
      };
    }
  }

  /**
   * Process admin user creation step
   */
  private async processAdminUserCreation(
    onboarding: TenantOnboarding
  ): Promise<OnboardingStepResult> {
    this.logger.log(
      `Processing admin user creation for onboarding: ${onboarding.id}`
    );

    const onboardingData = onboarding.onboardingData!;
    const adminUserData = onboardingData.adminUser!;

    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: adminUserData.email },
      });

      if (existingUser) {
        throw new Error(
          `User with email "${adminUserData.email}" already exists`
        );
      }

      // Get the tenant that was created in the previous step
      const tenant = await this.tenantRepository.findOne({
        where: { id: onboarding.tenantId! },
      });

      if (!tenant) {
        throw new Error(`Tenant with ID "${onboarding.tenantId}" not found`);
      }

      // Create user directly with the correct tenant
      const user = this.userRepository.create({
        email: adminUserData.email,
        password: (adminUserData as any).password || 'TempPassword123!', // Use provided password or temp
        firstName: adminUserData.firstName,
        lastName: adminUserData.lastName,
        tenantId: tenant.id,
        role: UserRole.OWNER, // Admin user should be owner
        authProvider: AuthProvider.LOCAL,
        status: UserStatus.ACTIVE,
        emailVerified: false, // Will be verified during onboarding
      });

      // Hash password before saving
      await user.hashPassword();
      const savedUser = await this.userRepository.save(user);

      onboarding.adminUserId = savedUser.id;
      onboarding.nextAction = 'Configuring subscription plan...';

      return {
        success: true,
        data: { adminUserId: savedUser.id },
        nextStep: OnboardingStep.PLAN_SELECTION,
      };
    } catch (error: any) {
      this.logger.error(
        `Admin user creation failed: ${error.message}`,
        error.stack
      );
      return {
        success: false,
        error: `Failed to create admin user: ${error.message}`,
      };
    }
  }

  /**
   * Process plan selection step
   */
  private async processPlanSelection(
    onboarding: TenantOnboarding
  ): Promise<OnboardingStepResult> {
    this.logger.log(
      `Processing plan selection for onboarding: ${onboarding.id}`
    );

    const plan = onboarding.onboardingData?.plan || 'free';

    // For free plan, skip payment setup
    if (plan === 'free') {
      onboarding.nextAction = 'Configuring features...';
      return {
        success: true,
        data: { plan, skipPayment: true },
        nextStep: OnboardingStep.FEATURE_CONFIGURATION,
      };
    }

    onboarding.nextAction = 'Setting up payment method...';
    return {
      success: true,
      data: { plan, requiresPayment: true },
      nextStep: OnboardingStep.PAYMENT_SETUP,
    };
  }

  /**
   * Process payment setup step
   */
  private async processPaymentSetup(
    onboarding: TenantOnboarding
  ): Promise<OnboardingStepResult> {
    this.logger.log(
      `Processing payment setup for onboarding: ${onboarding.id}`
    );

    // TODO: Integrate with Stripe when billing module is implemented
    // For now, we'll simulate payment setup
    onboarding.nextAction = 'Configuring features...';

    return {
      success: true,
      data: { paymentConfigured: true },
      nextStep: OnboardingStep.FEATURE_CONFIGURATION,
    };
  }

  /**
   * Process feature configuration step
   */
  private async processFeatureConfiguration(
    onboarding: TenantOnboarding
  ): Promise<OnboardingStepResult> {
    this.logger.log(
      `Processing feature configuration for onboarding: ${onboarding.id}`
    );

    const requestedFeatures =
      onboarding.onboardingData?.requestedFeatures || [];

    try {
      // Configure requested features
      for (const feature of requestedFeatures) {
        await this.tenantService.updateFeatureFlag(
          onboarding.tenantId!,
          feature as any,
          true
        );
      }

      onboarding.nextAction = 'Sending verification email...';

      return {
        success: true,
        data: { configuredFeatures: requestedFeatures },
        nextStep: OnboardingStep.VERIFICATION,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to configure features: ${error.message}`,
      };
    }
  }

  /**
   * Process verification step
   */
  private async processVerification(
    onboarding: TenantOnboarding
  ): Promise<OnboardingStepResult> {
    this.logger.log(`Processing verification for onboarding: ${onboarding.id}`);

    if (onboarding.autoVerify) {
      onboarding.verifiedAt = new Date();
      onboarding.nextAction = 'Finalizing setup...';

      return {
        success: true,
        data: { autoVerified: true },
        nextStep: OnboardingStep.COMPLETION,
      };
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.verificationTokenExpiry);

    onboarding.verificationToken = verificationToken;
    onboarding.verificationTokenExpiresAt = expiresAt;
    onboarding.nextAction =
      'Please check your email and click the verification link to continue';

    // Send verification email
    try {
      // Debug logging to identify null values
      const email = onboarding.onboardingData?.adminUser?.email;
      const firstName = onboarding.onboardingData?.adminUser?.firstName;
      const tenantName = onboarding.onboardingData?.tenantName;

      this.logger.debug(
        `Verification email data: email=${email}, firstName=${firstName}, tenantName=${tenantName}, token=${verificationToken}, onboardingId=${onboarding.id}`
      );

      if (!email || !firstName || !tenantName) {
        throw new Error(
          `Missing required email data: email=${email}, firstName=${firstName}, tenantName=${tenantName}`
        );
      }

      this.logger.log(`Attempting to send verification email to: ${email}`);

      await this.emailService.sendTenantOnboardingVerificationEmail(
        email,
        firstName,
        tenantName,
        verificationToken,
        onboarding.id
      );

      this.logger.log(`Verification email sent successfully to: ${email}`);

      return {
        success: true,
        data: { verificationEmailSent: true, expiresAt },
        nextStep: OnboardingStep.VERIFICATION, // Stay on verification step
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to send verification email: ${error.message}`,
      };
    }
  }

  /**
   * Process completion step
   */
  private async processCompletion(
    onboarding: TenantOnboarding
  ): Promise<OnboardingStepResult> {
    this.logger.log(`Processing completion for onboarding: ${onboarding.id}`);

    try {
      // Send welcome email if requested
      if (onboarding.sendWelcomeEmail && onboarding.adminUserId) {
        const adminUser = await this.userRepository.findOne({
          where: { id: onboarding.adminUserId },
        });

        if (adminUser) {
          await this.emailService.sendTenantOnboardingWelcomeEmail(
            adminUser.email,
            adminUser.firstName,
            onboarding.onboardingData!.tenantName!
          );
        }
      }

      onboarding.nextAction = 'Onboarding completed successfully!';

      return {
        success: true,
        data: { completed: true },
        nextStep: OnboardingStep.COMPLETION,
      };
    } catch (error: any) {
      this.logger.error(
        'Failed to send welcome email, but onboarding completed',
        error
      );
      return {
        success: true,
        data: { completed: true, emailError: error.message },
        nextStep: OnboardingStep.COMPLETION,
      };
    }
  }

  /**
   * Verify onboarding email
   */
  async verifyOnboarding(
    verifyDto: VerifyOnboardingDto
  ): Promise<OnboardingResponseDto> {
    const onboarding = await this.getOnboardingById(verifyDto.onboardingId);

    if (onboarding.currentStep !== OnboardingStep.VERIFICATION) {
      throw new BadRequestException('Onboarding is not in verification step');
    }

    if (onboarding.verifiedAt) {
      throw new BadRequestException('Onboarding is already verified');
    }

    if (
      !onboarding.verificationToken ||
      onboarding.verificationToken !== verifyDto.verificationToken
    ) {
      throw new BadRequestException('Invalid verification token');
    }

    if (onboarding.isVerificationTokenExpired) {
      throw new BadRequestException('Verification token has expired');
    }

    // Mark as verified and continue to completion
    onboarding.verifiedAt = new Date();
    delete onboarding.verificationToken;
    delete onboarding.verificationTokenExpiresAt;

    await this.onboardingRepository.save(onboarding);

    // Process completion step
    await this.processNextStep(onboarding.id);

    return this.mapToResponseDto(await this.getOnboardingById(onboarding.id));
  }

  /**
   * Resend verification email
   */
  async resendVerification(
    resendDto: ResendVerificationDto
  ): Promise<{ message: string }> {
    const onboarding = await this.getOnboardingById(resendDto.onboardingId);

    if (onboarding.currentStep !== OnboardingStep.VERIFICATION) {
      throw new BadRequestException('Onboarding is not in verification step');
    }

    if (onboarding.verifiedAt) {
      throw new BadRequestException('Onboarding is already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.verificationTokenExpiry);

    onboarding.verificationToken = verificationToken;
    onboarding.verificationTokenExpiresAt = expiresAt;

    await this.onboardingRepository.save(onboarding);

    // Send verification email
    const email =
      resendDto.email || onboarding.onboardingData?.adminUser?.email;
    const firstName = onboarding.onboardingData?.adminUser?.firstName;
    const tenantName = onboarding.onboardingData?.tenantName;

    this.logger.debug(
      `Resend verification email data: email=${email}, firstName=${firstName}, tenantName=${tenantName}, token=${verificationToken}, onboardingId=${onboarding.id}`
    );

    if (!email || !firstName || !tenantName) {
      throw new Error(
        `Missing required email data for resend: email=${email}, firstName=${firstName}, tenantName=${tenantName}`
      );
    }

    await this.emailService.sendTenantOnboardingVerificationEmail(
      email,
      firstName,
      tenantName,
      verificationToken,
      onboarding.id
    );

    return { message: 'Verification email sent successfully' };
  }

  /**
   * Cancel onboarding
   */
  async cancelOnboarding(
    cancelDto: CancelOnboardingDto
  ): Promise<{ message: string }> {
    const onboarding = await this.getOnboardingById(cancelDto.onboardingId);

    if (onboarding.isCompleted) {
      throw new BadRequestException('Cannot cancel completed onboarding');
    }

    if (onboarding.isCancelled) {
      throw new BadRequestException('Onboarding is already cancelled');
    }

    return await this.dataSource.transaction(async manager => {
      // Cancel onboarding
      onboarding.cancel(cancelDto.reason);
      await manager.save(TenantOnboarding, onboarding);

      // Cleanup resources if requested
      if (cancelDto.cleanup !== false) {
        if (onboarding.adminUserId) {
          await manager.softDelete(User, { id: onboarding.adminUserId });
        }

        if (onboarding.tenantId) {
          await manager.softDelete(Tenant, { id: onboarding.tenantId });
        }
      }

      return { message: 'Onboarding cancelled successfully' };
    });
  }

  /**
   * Get onboarding progress
   */
  async getOnboardingProgress(
    onboardingId: string
  ): Promise<OnboardingProgressDto> {
    const onboarding = await this.getOnboardingById(onboardingId);

    return {
      onboardingId: onboarding.id,
      currentStep: onboarding.currentStep,
      status: onboarding.status,
      completedSteps: onboarding.completedSteps,
      progressPercentage: onboarding.progressPercentage,
      tenantId: onboarding.tenantId!,
      adminUserId: onboarding.adminUserId!,
      estimatedCompletion: onboarding.estimatedCompletion!,
      nextAction: onboarding.nextAction!,
    };
  }

  /**
   * Get onboarding by ID
   */
  private async getOnboardingById(id: string): Promise<TenantOnboarding> {
    if (!validateUUID(id)) {
      throw new BadRequestException(`Invalid onboarding ID format: "${id}"`);
    }

    const onboarding = await this.onboardingRepository.findOne({
      where: { id },
      relations: ['tenant', 'adminUser'],
    });

    if (!onboarding) {
      throw new NotFoundException(`Onboarding with ID "${id}" not found`);
    }

    return onboarding;
  }

  /**
   * Validate tenant uniqueness
   */
  private async validateTenantUniqueness(
    name: string,
    domain?: string
  ): Promise<void> {
    const existingByName = await this.tenantRepository.findOne({
      where: { name },
    });

    if (existingByName) {
      throw new ConflictException(`Tenant with name "${name}" already exists`);
    }

    if (domain) {
      const existingByDomain = await this.tenantRepository.findOne({
        where: { domain },
      });

      if (existingByDomain) {
        throw new ConflictException(
          `Tenant with domain "${domain}" already exists`
        );
      }
    }
  }

  /**
   * Validate admin user uniqueness
   */
  private async validateAdminUserUniqueness(email: string): Promise<void> {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email "${email}" already exists`);
    }
  }

  /**
   * Map onboarding entity to response DTO
   */
  private mapToResponseDto(
    onboarding: TenantOnboarding
  ): OnboardingResponseDto {
    return {
      onboardingId: onboarding.id,
      status: onboarding.status,
      currentStep: onboarding.currentStep,
      progressPercentage: onboarding.progressPercentage,
      nextAction: onboarding.nextAction || 'Processing...',
      ...(onboarding.tenantId && { tenantId: onboarding.tenantId }),
      ...(onboarding.adminUserId && { adminUserId: onboarding.adminUserId }),
      estimatedCompletion: onboarding.estimatedCompletion || new Date(),
    };
  }
}
