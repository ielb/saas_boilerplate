import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole, UserStatus } from '@app/shared';
import { AuditEventType } from '../../audit/entities/audit-log.entity';
import { EmailService } from '../../email/services/email.service';
import { AuditService } from '../../audit/services/audit.service';

export interface UserLifecycleOptions {
  sendEmailVerification?: boolean;
  sendWelcomeEmail?: boolean;
  auditEvent?: string;
}

export interface UserActivationOptions {
  skipEmailVerification?: boolean;
  auditEvent?: string;
}

export interface UserSuspensionOptions {
  reason?: string | undefined;
  duration?: number | undefined; // in days, null for indefinite
  auditEvent?: string | undefined;
}

export interface UserReactivationOptions {
  auditEvent?: string;
}

@Injectable()
export class UserLifecycleService {
  private readonly logger = new Logger(UserLifecycleService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Register a new user with proper lifecycle management
   */
  async registerUser(
    userData: Partial<User>,
    options: UserLifecycleOptions = {}
  ): Promise<User> {
    this.logger.log(`Registering new user: ${userData.email}`);

    // Validate user data
    this.validateUserRegistrationData(userData);

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email!, tenantId: userData.tenantId! },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists with this email');
    }

    // Create user with proper initial state
    const user = this.userRepository.create({
      ...userData,
      status: UserStatus.PENDING,
      emailVerified: false,
    });

    // Generate email verification token if needed
    if (options.sendEmailVerification !== false) {
      user.generateEmailVerificationToken();
    }

    // Save user
    const savedUser = await this.userRepository.save(user);

    // Send emails
    await this.sendRegistrationEmails(savedUser, options);

    // Audit the registration
    await this.auditService.logEvent({
      eventType: AuditEventType.USER_REGISTERED,
      userId: savedUser.id,
      tenantId: savedUser.tenantId,
      userEmail: savedUser.email,
      metadata: {
        email: savedUser.email,
        role: savedUser.role,
        status: savedUser.status,
      },
    });

    this.logger.log(`User registered successfully: ${savedUser.email}`);
    return savedUser;
  }

  /**
   * Activate a user account
   */
  async activateUser(
    userId: string,
    options: UserActivationOptions = {}
  ): Promise<User> {
    this.logger.log(`Activating user: ${userId}`);

    const user = await this.findUserById(userId);

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already active');
    }

    if (user.status === UserStatus.DELETED) {
      throw new BadRequestException('Cannot activate a deleted user');
    }

    // Store previous status for audit
    const previousStatus = user.status;

    // Update user status
    user.status = UserStatus.ACTIVE;

    // Mark email as verified if not already
    if (!user.emailVerified && !options.skipEmailVerification) {
      user.markEmailAsVerified();
    }

    // Clear any suspension data
    user.metadata = {
      ...user.metadata,
      suspendedAt: null,
      suspensionReason: null,
      suspensionExpiresAt: null,
    };

    const updatedUser = await this.userRepository.save(user);

    // Send activation notification
    await this.emailService.sendUserActivationNotification(user);

    // Audit the activation
    await this.auditService.logEvent({
      eventType: AuditEventType.USER_ACTIVATED,
      userId: user.id,
      tenantId: user.tenantId,
      userEmail: user.email,
      metadata: {
        previousStatus: previousStatus,
        newStatus: UserStatus.ACTIVE,
        emailVerified: user.emailVerified,
      },
    });

    this.logger.log(`User activated successfully: ${user.email}`);
    return updatedUser;
  }

  /**
   * Suspend a user account
   */
  async suspendUser(
    userId: string,
    options: UserSuspensionOptions = {}
  ): Promise<User> {
    this.logger.log(`Suspending user: ${userId}`);

    const user = await this.findUserById(userId);

    if (user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('User is already suspended');
    }

    if (user.status === UserStatus.DELETED) {
      throw new BadRequestException('Cannot suspend a deleted user');
    }

    if (user.role === UserRole.OWNER) {
      throw new BadRequestException('Cannot suspend tenant owner');
    }

    // Store previous status for audit
    const previousStatus = user.status;

    // Update user status
    user.status = UserStatus.SUSPENDED;

    // Store suspension metadata
    const suspensionData = {
      suspendedAt: new Date(),
      suspensionReason: options.reason || 'Administrative suspension',
      suspensionExpiresAt: options.duration
        ? new Date(Date.now() + options.duration * 24 * 60 * 60 * 1000)
        : null,
    };

    user.metadata = {
      ...user.metadata,
      ...suspensionData,
    };

    const updatedUser = await this.userRepository.save(user);

    // Send suspension notification
    const emailSuspensionData = {
      suspendedAt: suspensionData.suspendedAt,
      suspensionReason: suspensionData.suspensionReason,
      ...(suspensionData.suspensionExpiresAt && {
        suspensionExpiresAt: suspensionData.suspensionExpiresAt,
      }),
    };
    await this.emailService.sendUserSuspensionNotification(
      user,
      emailSuspensionData
    );

    // Audit the suspension
    await this.auditService.logEvent({
      eventType: AuditEventType.USER_SUSPENDED,
      userId: user.id,
      tenantId: user.tenantId,
      userEmail: user.email,
      metadata: {
        previousStatus: previousStatus,
        newStatus: UserStatus.SUSPENDED,
        reason: options.reason,
        duration: options.duration,
        expiresAt: suspensionData.suspensionExpiresAt,
      },
    });

    this.logger.log(`User suspended successfully: ${user.email}`);
    return updatedUser;
  }

  /**
   * Reactivate a suspended user
   */
  async reactivateUser(
    userId: string,
    options: UserReactivationOptions = {}
  ): Promise<User> {
    this.logger.log(`Reactivating user: ${userId}`);

    const user = await this.findUserById(userId);

    if (user.status !== UserStatus.SUSPENDED) {
      throw new BadRequestException('User is not suspended');
    }

    // Update user status
    user.status = UserStatus.ACTIVE;

    // Clear suspension metadata
    user.metadata = {
      ...user.metadata,
      suspendedAt: null,
      suspensionReason: null,
      suspensionExpiresAt: null,
    };

    const updatedUser = await this.userRepository.save(user);

    // Send reactivation notification
    await this.emailService.sendUserReactivationNotification(user);

    // Audit the reactivation
    await this.auditService.logEvent({
      eventType: AuditEventType.USER_REACTIVATED,
      userId: user.id,
      tenantId: user.tenantId,
      userEmail: user.email,
      metadata: {
        previousStatus: UserStatus.SUSPENDED,
        newStatus: UserStatus.ACTIVE,
      },
    });

    this.logger.log(`User reactivated successfully: ${user.email}`);
    return updatedUser;
  }

  /**
   * Soft delete a user account
   */
  async deleteUser(userId: string, auditEvent?: string): Promise<void> {
    this.logger.log(`Deleting user: ${userId}`);

    const user = await this.findUserById(userId);

    if (user.role === UserRole.OWNER) {
      throw new BadRequestException('Cannot delete tenant owner');
    }

    // Soft delete the user
    await this.userRepository.softDelete(userId);

    // Send deletion notification
    await this.emailService.sendUserDeletionNotification(user);

    // Audit the deletion
    await this.auditService.logEvent({
      eventType: AuditEventType.USER_DELETED,
      userId: user.id,
      tenantId: user.tenantId,
      userEmail: user.email,
      metadata: {
        previousStatus: user.status,
        email: user.email,
        role: user.role,
      },
    });

    this.logger.log(`User deleted successfully: ${user.email}`);
  }

  /**
   * Get user lifecycle information
   */
  async getUserLifecycleInfo(userId: string): Promise<{
    user: User;
    isActive: boolean;
    isSuspended: boolean;
    isDeleted: boolean;
    suspensionInfo?: {
      suspendedAt: Date;
      reason: string;
      expiresAt?: Date;
      isExpired: boolean;
    };
  }> {
    const user = await this.findUserById(userId);

    const isActive = user.status === UserStatus.ACTIVE;
    const isSuspended = user.status === UserStatus.SUSPENDED;
    const isDeleted = user.status === UserStatus.DELETED;

    let suspensionInfo;
    if (isSuspended && user.metadata?.suspendedAt) {
      const now = new Date();
      const expiresAt = user.metadata.suspensionExpiresAt
        ? new Date(user.metadata.suspensionExpiresAt)
        : null;

      const suspensionInfoData: {
        suspendedAt: Date;
        reason: string;
        isExpired: boolean;
        expiresAt?: Date;
      } = {
        suspendedAt: new Date(user.metadata.suspendedAt),
        reason: user.metadata.suspensionReason || 'No reason provided',
        isExpired: expiresAt ? now > expiresAt : false,
      };

      if (expiresAt) {
        suspensionInfoData.expiresAt = expiresAt;
      }

      suspensionInfo = suspensionInfoData;
    }

    const result: {
      user: User;
      isActive: boolean;
      isSuspended: boolean;
      isDeleted: boolean;
      suspensionInfo?: {
        suspendedAt: Date;
        reason: string;
        expiresAt?: Date;
        isExpired: boolean;
      };
    } = {
      user,
      isActive,
      isSuspended,
      isDeleted,
    };

    if (suspensionInfo) {
      result.suspensionInfo = suspensionInfo;
    }

    return result;
  }

  /**
   * Check and auto-reactivate expired suspensions
   */
  async checkAndReactivateExpiredSuspensions(): Promise<number> {
    this.logger.log('Checking for expired user suspensions');

    const suspendedUsers = await this.userRepository.find({
      where: { status: UserStatus.SUSPENDED },
    });

    let reactivatedCount = 0;

    for (const user of suspendedUsers) {
      if (user.metadata?.suspensionExpiresAt) {
        const expiresAt = new Date(user.metadata.suspensionExpiresAt);
        if (new Date() > expiresAt) {
          await this.reactivateUser(user.id, {
            auditEvent: 'user.auto_reactivated',
          });
          reactivatedCount++;
        }
      }
    }

    this.logger.log(`Auto-reactivated ${reactivatedCount} expired suspensions`);
    return reactivatedCount;
  }

  /**
   * Find user by ID with proper error handling
   */
  private async findUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  /**
   * Validate user registration data
   */
  private validateUserRegistrationData(userData: Partial<User>): void {
    if (!userData.email) {
      throw new BadRequestException('Email is required');
    }

    if (!userData.firstName) {
      throw new BadRequestException('First name is required');
    }

    if (!userData.lastName) {
      throw new BadRequestException('Last name is required');
    }

    if (!userData.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
  }

  /**
   * Send registration-related emails
   */
  private async sendRegistrationEmails(
    user: User,
    options: UserLifecycleOptions
  ): Promise<void> {
    try {
      if (options.sendEmailVerification !== false) {
        await this.emailService.sendEmailVerification(user);
      }

      if (options.sendWelcomeEmail) {
        await this.emailService.sendWelcomeEmail(user);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to send registration emails: ${error.message || 'Unknown error'}`
      );
      // Don't throw error to avoid failing registration
    }
  }
}
