import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';

import { User } from '../../users/entities/user.entity';

// Temporary email config until @app/config is available
interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'postmark';
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
}

@Injectable()
export class EmailService {
  private transporter!: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on configuration
   */
  private async initializeTransporter(): Promise<void> {
    // Temporary config until @app/config is available
    const config: EmailConfig = {
      provider: 'smtp',
      smtp: {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '1025'), // Changed to 1025 for Mailhog
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    switch (config.provider) {
      case 'smtp':
        this.transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth:
            config.smtp.user && config.smtp.pass
              ? {
                  user: config.smtp.user,
                  pass: config.smtp.pass,
                }
              : undefined, // Use undefined instead of false for no auth
          // Add these options for Mailhog
          ignoreTLS: true,
          requireTLS: false,
        } as any); // Type assertion to avoid TypeScript issues
        break;

      case 'sendgrid':
        // SendGrid configuration would go here
        // This is a placeholder for now
        break;

      case 'ses':
        // AWS SES configuration would go here
        // This is a placeholder for now
        break;

      case 'postmark':
        // Postmark configuration would go here
        // This is a placeholder for now
        break;

      default:
        // Default to SMTP
        this.transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth:
            config.smtp.user && config.smtp.pass
              ? {
                  user: config.smtp.user,
                  pass: config.smtp.pass,
                }
              : undefined, // Use undefined instead of false for no auth
          // Add these options for Mailhog
          ignoreTLS: true,
          requireTLS: false,
        } as any); // Type assertion to avoid TypeScript issues
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(user: User): Promise<void> {
    const verificationUrl = `${process.env.WEB_URL}/verify-email?token=${user.emailVerificationToken}`;

    const emailData = {
      to: user.email,
      subject: 'Verify Your Email Address',
      template: 'email-verification',
      context: {
        name: user.firstName,
        verificationUrl,
        token: user.emailVerificationToken,
        expiresAt: user.emailVerificationTokenExpiresAt,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(user: User): Promise<void> {
    const resetUrl = `${process.env.WEB_URL}/reset-password?token=${user.passwordResetToken}`;

    const emailData = {
      to: user.email,
      subject: 'Reset Your Password',
      template: 'password-reset',
      context: {
        name: user.firstName,
        resetUrl,
        token: user.passwordResetToken,
        expiresAt: user.passwordResetTokenExpiresAt,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    user: User,
    welcomeData?: {
      invitation?: any;
      tenant?: any;
    }
  ): Promise<void> {
    const emailData = {
      to: user.email,
      subject: welcomeData?.tenant?.name
        ? `Welcome to ${welcomeData.tenant.name}!`
        : 'Welcome to Our Platform!',
      template: welcomeData?.invitation ? 'welcome-invitation' : 'welcome',
      context: {
        name: user.firstName,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
        tenantName: welcomeData?.tenant?.name || 'our platform',
        supportEmail:
          process.env.SUPPORT_EMAIL || 'support@saas-boilerplate.com',
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send generic email
   */
  async sendEmail(data: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, any>;
  }): Promise<void> {
    try {
      const { html, text } = await this.renderEmailTemplate(
        data.template,
        data.context
      );

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@saas-boilerplate.com',
        to: data.to,
        subject: data.subject,
        html,
        text,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      // Re-throw the error so it's not silently ignored
      throw error;
    }
  }

  /**
   * Render email template
   */
  private async renderEmailTemplate(
    templateName: string,
    context: Record<string, any>
  ): Promise<{ html: string; text: string }> {
    // In a real implementation, you would load templates from files
    // For now, we'll use inline templates

    type TemplateType =
      | 'email-verification'
      | 'password-reset'
      | 'welcome'
      | 'account-recovery'
      | 'account-recovery-completed'
      | 'tenant-onboarding-verification'
      | 'tenant-onboarding-welcome'
      | 'user-activation'
      | 'user-suspension'
      | 'user-reactivation'
      | 'user-deletion'
      | 'team-invitation'
      | 'team-switch-notification';

    const templates: Record<TemplateType, { html: string; text: string }> = {
      'email-verification': {
        html: `
          <h1>Verify Your Email Address</h1>
          <p>Hello {{name}},</p>
          <p>Please click the link below to verify your email address:</p>
          <a href="{{verificationUrl}}">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        `,
        text: `
          Verify Your Email Address
          
          Hello {{name}},
          
          Please click the link below to verify your email address:
          {{verificationUrl}}
          
          This link will expire in 24 hours.
          
          If you didn't create an account, you can safely ignore this email.
        `,
      },
      'password-reset': {
        html: `
          <h1>Reset Your Password</h1>
          <p>Hello {{name}},</p>
          <p>You requested to reset your password. Click the link below to set a new password:</p>
          <a href="{{resetUrl}}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
        `,
        text: `
          Reset Your Password
          
          Hello {{name}},
          
          You requested to reset your password. Click the link below to set a new password:
          {{resetUrl}}
          
          This link will expire in 1 hour.
          
          If you didn't request a password reset, you can safely ignore this email.
        `,
      },
      welcome: {
        html: `
          <h1>Welcome to Our Platform!</h1>
          <p>Hello {{name}},</p>
          <p>Thank you for joining our platform. We're excited to have you on board!</p>
          <p>You can now log in to your account:</p>
          <a href="{{loginUrl}}">Login to Your Account</a>
          <p>If you have any questions, feel free to contact our support team.</p>
        `,
        text: `
          Welcome to Our Platform!
          
          Hello {{name}},
          
          Thank you for joining our platform. We're excited to have you on board!
          
          You can now log in to your account:
          {{loginUrl}}
          
          If you have any questions, feel free to contact our support team.
        `,
      },
      'account-recovery': {
        html: `
          <h1>Account Recovery Request</h1>
          <p>Hello {{name}},</p>
          <p>We received a request to recover your account. If this was you, please use the recovery token below:</p>
          <p><strong>Recovery Token: {{recoveryToken}}</strong></p>
          <p>Or click the link below to proceed with account recovery:</p>
          <a href="{{recoveryUrl}}">Recover Account</a>
          <p>This recovery session will expire at: {{expiresAt}}</p>
          <p>If you didn't request account recovery, please ignore this email and ensure your account is secure.</p>
        `,
        text: `
          Account Recovery Request
          
          Hello {{name}},
          
          We received a request to recover your account. If this was you, please use the recovery token below:
          
          Recovery Token: {{recoveryToken}}
          
          Or visit this link to proceed with account recovery:
          {{recoveryUrl}}
          
          This recovery session will expire at: {{expiresAt}}
          
          If you didn't request account recovery, please ignore this email and ensure your account is secure.
        `,
      },
      'account-recovery-completed': {
        html: `
          <h1>Account Recovery Completed</h1>
          <p>Hello {{name}},</p>
          <p>Your account recovery has been completed successfully. Your MFA has been reset and new backup codes have been generated.</p>
          <p>You can now log in to your account:</p>
          <a href="{{loginUrl}}">Login to Your Account</a>
          <p>Please set up your new MFA device and save your new backup codes in a secure location.</p>
          <p>If you didn't complete this recovery, please contact our support team immediately.</p>
        `,
        text: `
          Account Recovery Completed
          
          Hello {{name}},
          
          Your account recovery has been completed successfully. Your MFA has been reset and new backup codes have been generated.
          
          You can now log in to your account:
          {{loginUrl}}
          
          Please set up your new MFA device and save your new backup codes in a secure location.
          
          If you didn't complete this recovery, please contact our support team immediately.
        `,
      },
      'tenant-onboarding-verification': {
        html: `
          <h1>Verify Your Tenant Registration</h1>
          <p>Hello {{name}},</p>
          <p>Thank you for starting the registration process for <strong>{{tenantName}}</strong>!</p>
          <p>To complete your tenant setup, please click the verification link below:</p>
          <a href="{{verificationUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">Verify Tenant Registration</a>
          <p>This verification link will expire in 24 hours.</p>
          <p>If you didn't request this tenant registration, you can safely ignore this email.</p>
          <p>If you have any questions, feel free to contact our support team.</p>
        `,
        text: `
          Verify Your Tenant Registration
          
          Hello {{name}},
          
          Thank you for starting the registration process for {{tenantName}}!
          
          To complete your tenant setup, please click the verification link below:
          {{verificationUrl}}
          
          This verification link will expire in 24 hours.
          
          If you didn't request this tenant registration, you can safely ignore this email.
          
          If you have any questions, feel free to contact our support team.
        `,
      },
      'tenant-onboarding-welcome': {
        html: `
          <h1>Welcome to {{tenantName}}!</h1>
          <p>Hello {{name}},</p>
          <p>Congratulations! Your tenant <strong>{{tenantName}}</strong> has been successfully set up and is ready to use.</p>
          <p>Here's what you can do next:</p>
          <ul>
            <li>Log in to your admin dashboard</li>
            <li>Invite team members to join your organization</li>
            <li>Configure your tenant settings and branding</li>
            <li>Explore the available features</li>
          </ul>
          <p>You can access your tenant dashboard here:</p>
          <a href="{{loginUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px;">Access Your Dashboard</a>
          <p>If you need help getting started, check out our documentation or contact our support team.</p>
          <p>Welcome aboard!</p>
        `,
        text: `
          Welcome to {{tenantName}}!
          
          Hello {{name}},
          
          Congratulations! Your tenant {{tenantName}} has been successfully set up and is ready to use.
          
          Here's what you can do next:
          - Log in to your admin dashboard
          - Invite team members to join your organization
          - Configure your tenant settings and branding
          - Explore the available features
          
          You can access your tenant dashboard here:
          {{loginUrl}}
          
          If you need help getting started, check out our documentation or contact our support team.
          
          Welcome aboard!
        `,
      },
      'user-activation': {
        html: `
          <h1>Your Account Has Been Activated</h1>
          <p>Hello {{name}},</p>
          <p>Great news! Your account has been activated and you can now access our platform.</p>
          <p>You can log in to your account using the link below:</p>
          <a href="{{loginUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px;">Login to Your Account</a>
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <p>Welcome to our platform!</p>
        `,
        text: `
          Your Account Has Been Activated
          
          Hello {{name}},
          
          Great news! Your account has been activated and you can now access our platform.
          
          You can log in to your account using the link below:
          {{loginUrl}}
          
          If you have any questions or need assistance, please don't hesitate to contact our support team.
          
          Welcome to our platform!
        `,
      },
      'user-suspension': {
        html: `
          <h1>Your Account Has Been Suspended</h1>
          <p>Hello {{name}},</p>
          <p>We regret to inform you that your account has been suspended.</p>
          <p><strong>Reason for suspension:</strong> {{reason}}</p>
          <p><strong>Suspended on:</strong> {{suspendedAt}}</p>
          {{#if isTemporary}}
          <p><strong>This suspension will expire on:</strong> {{expiresAt}}</p>
          <p>Your account will be automatically reactivated after this date.</p>
          {{else}}
          <p>This suspension is indefinite. Please contact our support team for more information.</p>
          {{/if}}
          <p>If you believe this suspension was made in error or have any questions, please contact our support team at {{supportEmail}}.</p>
          <p>We appreciate your understanding.</p>
        `,
        text: `
          Your Account Has Been Suspended
          
          Hello {{name}},
          
          We regret to inform you that your account has been suspended.
          
          Reason for suspension: {{reason}}
          Suspended on: {{suspendedAt}}
          {{#if isTemporary}}
          This suspension will expire on: {{expiresAt}}
          Your account will be automatically reactivated after this date.
          {{else}}
          This suspension is indefinite. Please contact our support team for more information.
          {{/if}}
          
          If you believe this suspension was made in error or have any questions, please contact our support team at {{supportEmail}}.
          
          We appreciate your understanding.
        `,
      },
      'user-reactivation': {
        html: `
          <h1>Your Account Has Been Reactivated</h1>
          <p>Hello {{name}},</p>
          <p>Good news! Your account has been reactivated and you can now access our platform again.</p>
          <p>You can log in to your account using the link below:</p>
          <a href="{{loginUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px;">Login to Your Account</a>
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <p>Welcome back!</p>
        `,
        text: `
          Your Account Has Been Reactivated
          
          Hello {{name}},
          
          Good news! Your account has been reactivated and you can now access our platform again.
          
          You can log in to your account using the link below:
          {{loginUrl}}
          
          If you have any questions or need assistance, please don't hesitate to contact our support team.
          
          Welcome back!
        `,
      },
      'user-deletion': {
        html: `
          <h1>Your Account Has Been Deleted</h1>
          <p>Hello {{name}},</p>
          <p>We regret to inform you that your account has been deleted from our platform.</p>
          <p>If you believe this deletion was made in error or have any questions, please contact our support team at {{supportEmail}}.</p>
          <p>Thank you for using our platform.</p>
        `,
        text: `
          Your Account Has Been Deleted
          
          Hello {{name}},
          
          We regret to inform you that your account has been deleted from our platform.
          
          If you believe this deletion was made in error or have any questions, please contact our support team at {{supportEmail}}.
          
          Thank you for using our platform.
        `,
      },
      'team-invitation': {
        html: `
          <h1>You've Been Invited to Join {{teamName}}</h1>
          <p>Hello there!</p>
          <p>{{inviterName}} has invited you to join the team <strong>{{teamName}}</strong> as a <strong>{{roleName}}</strong>.</p>
          {{#if message}}
          <p><strong>Message from {{inviterName}}:</strong></p>
          <p>{{message}}</p>
          {{/if}}
          <p>To accept this invitation, please click the link below:</p>
          <a href="{{invitationUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">Accept Invitation</a>
          <p>This invitation will expire in {{expiresIn}}.</p>
          <p>If you don't want to accept this invitation, you can safely ignore this email.</p>
          <p>If you have any questions, please contact the team administrator.</p>
        `,
        text: `
          You've Been Invited to Join {{teamName}}
          
          Hello there!
          
          {{inviterName}} has invited you to join the team {{teamName}} as a {{roleName}}.
          
          {{#if message}}
          Message from {{inviterName}}:
          {{message}}
          {{/if}}
          
          To accept this invitation, please visit this link:
          {{invitationUrl}}
          
          This invitation will expire in {{expiresIn}}.
          
          If you don't want to accept this invitation, you can safely ignore this email.
          
          If you have any questions, please contact the team administrator.
        `,
      },
      'team-switch-notification': {
        html: `
          <h1>{{userName}} Joined Your Team</h1>
          <p>Hello!</p>
          <p><strong>{{userName}}</strong> ({{userEmail}}) has switched to your team <strong>{{teamName}}</strong>.</p>
          <p>You can view your team dashboard to see the latest activity:</p>
          <a href="{{dashboardUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px;">View Team Dashboard</a>
          <p>This notification helps keep team members informed about who is currently active in the team.</p>
        `,
        text: `
          {{userName}} Joined Your Team
          
          Hello!
          
          {{userName}} ({{userEmail}}) has switched to your team {{teamName}}.
          
          You can view your team dashboard to see the latest activity:
          {{dashboardUrl}}
          
          This notification helps keep team members informed about who is currently active in the team.
        `,
      },
    };

    const template = templates[templateName as TemplateType];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const htmlTemplate = handlebars.compile(template.html);
    const textTemplate = handlebars.compile(template.text);

    return {
      html: htmlTemplate(context),
      text: textTemplate(context),
    };
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email configuration test failed:', error);
      return false;
    }
  }

  /**
   * Send account recovery email
   */
  async sendAccountRecoveryEmail(
    email: string,
    firstName: string,
    recoveryToken: string,
    expiresAt: Date
  ): Promise<void> {
    const emailData = {
      to: email,
      subject: 'Account Recovery Request',
      template: 'account-recovery',
      context: {
        name: firstName,
        recoveryToken,
        expiresAt: expiresAt.toISOString(),
        recoveryUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recover-account?token=${recoveryToken}`,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send account recovery completed email
   */
  async sendAccountRecoveryCompletedEmail(
    email: string,
    firstName: string
  ): Promise<void> {
    const emailData = {
      to: email,
      subject: 'Account Recovery Completed',
      template: 'account-recovery-completed',
      context: {
        name: firstName,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send tenant onboarding verification email
   */
  async sendTenantOnboardingVerificationEmail(
    email: string,
    firstName: string,
    tenantName: string,
    verificationToken: string,
    onboardingId: string
  ): Promise<void> {
    const emailData = {
      to: email,
      subject: `Verify Your Registration for ${tenantName}`,
      template: 'tenant-onboarding-verification',
      context: {
        name: firstName,
        tenantName,
        verificationToken,
        onboardingId,
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/onboarding/verify?token=${verificationToken}&id=${onboardingId}`,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send tenant onboarding welcome email
   */
  async sendTenantOnboardingWelcomeEmail(
    email: string,
    firstName: string,
    tenantName: string
  ): Promise<void> {
    const emailData = {
      to: email,
      subject: `Welcome to ${tenantName}!`,
      template: 'tenant-onboarding-welcome',
      context: {
        name: firstName,
        tenantName,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send user activation notification
   */
  async sendUserActivationNotification(user: User): Promise<void> {
    const emailData = {
      to: user.email,
      subject: 'Your Account Has Been Activated',
      template: 'user-activation',
      context: {
        name: user.firstName,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send user suspension notification
   */
  async sendUserSuspensionNotification(
    user: User,
    suspensionData: {
      suspendedAt: Date;
      suspensionReason: string;
      suspensionExpiresAt?: Date;
    }
  ): Promise<void> {
    const emailData = {
      to: user.email,
      subject: 'Your Account Has Been Suspended',
      template: 'user-suspension',
      context: {
        name: user.firstName,
        reason: suspensionData.suspensionReason,
        suspendedAt: suspensionData.suspendedAt.toISOString(),
        expiresAt: suspensionData.suspensionExpiresAt?.toISOString(),
        isTemporary: !!suspensionData.suspensionExpiresAt,
        supportEmail:
          process.env.SUPPORT_EMAIL || 'support@saas-boilerplate.com',
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send user reactivation notification
   */
  async sendUserReactivationNotification(user: User): Promise<void> {
    const emailData = {
      to: user.email,
      subject: 'Your Account Has Been Reactivated',
      template: 'user-reactivation',
      context: {
        name: user.firstName,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send user deletion notification
   */
  async sendUserDeletionNotification(user: User): Promise<void> {
    const emailData = {
      to: user.email,
      subject: 'Your Account Has Been Deleted',
      template: 'user-deletion',
      context: {
        name: user.firstName,
        supportEmail:
          process.env.SUPPORT_EMAIL || 'support@saas-boilerplate.com',
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send team invitation email
   */
  async sendTeamInvitation(invitationData: {
    to: string;
    teamName: string;
    inviterName: string;
    roleName: string;
    invitationToken: string;
    message?: string;
  }): Promise<void> {
    const emailData = {
      to: invitationData.to,
      subject: `You've been invited to join ${invitationData.teamName}`,
      template: 'team-invitation',
      context: {
        teamName: invitationData.teamName,
        inviterName: invitationData.inviterName,
        roleName: invitationData.roleName,
        invitationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/teams/invite?token=${invitationData.invitationToken}`,
        message: invitationData.message,
        expiresIn: '7 days',
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(invitationData: {
    to: string;
    invitationUrl: string;
    invitedBy: User;
    invitation: any;
    tenant: any;
  }): Promise<void> {
    const emailData = {
      to: invitationData.to,
      subject: `You've been invited to join ${invitationData.tenant?.name || 'our platform'}`,
      template: 'invitation',
      context: {
        invitedByName: `${invitationData.invitedBy.firstName} ${invitationData.invitedBy.lastName}`,
        tenantName: invitationData.tenant?.name || 'our platform',
        invitationUrl: invitationData.invitationUrl,
        message: invitationData.invitation?.message,
        expiresIn: '14 days',
        roleType: invitationData.invitation?.type || 'Team Member',
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send team switch notification email
   */
  async sendTeamSwitchNotification(notificationData: {
    to: string;
    teamName: string;
    userName: string;
    userEmail: string;
  }): Promise<void> {
    const emailData = {
      to: notificationData.to,
      subject: `${notificationData.userName} joined your team`,
      template: 'team-switch-notification',
      context: {
        teamName: notificationData.teamName,
        userName: notificationData.userName,
        userEmail: notificationData.userEmail,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
      },
    };

    await this.sendEmail(emailData);
  }
}
