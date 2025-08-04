import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';

import { User } from '../entities/user.entity';

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
  async sendWelcomeEmail(user: User): Promise<void> {
    const emailData = {
      to: user.email,
      subject: 'Welcome to Our Platform!',
      template: 'welcome',
      context: {
        name: user.firstName,
        loginUrl: `${process.env.WEB_URL}/login`,
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
      console.error('Failed to send email:', error);
      // In production, you might want to log this to a monitoring service
      // or queue it for retry
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
      | 'account-recovery-completed';

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
      console.error('Email configuration test failed:', error);
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
}
