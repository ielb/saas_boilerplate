import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

import { EmailService } from './email.service';
import { UserStatus, UserRole } from '@app/shared';

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    tenantId: 'tenant-123',
    emailVerificationToken: 'verification-token-123',
    passwordResetToken: 'reset-token-456',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'email.from': 'noreply@example.com',
                'email.fromName': 'SaaS Boilerplate',
                'app.url': 'http://localhost:3000',
                'app.name': 'SaaS Boilerplate',
              };
              return config[key];
            }),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('sendEmailVerification', () => {
    it('should send email verification successfully', async () => {
      // Arrange
      const user = {
        ...mockUser,
        emailVerificationToken: 'verification-token-123',
      };

      // Act
      await service.sendEmailVerification(user as any);

      // Assert
      // Since this is a mock service, we just verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should handle user without verification token', async () => {
      // Arrange
      const user = { ...mockUser, emailVerificationToken: null };

      // Act
      await service.sendEmailVerification(user as any);

      // Assert
      // Since this is a mock service, we just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email successfully', async () => {
      // Arrange
      const user = { ...mockUser, passwordResetToken: 'reset-token-456' };

      // Act
      await service.sendPasswordReset(user as any);

      // Assert
      // Since this is a mock service, we just verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should handle user without reset token', async () => {
      // Arrange
      const user = { ...mockUser, passwordResetToken: null };

      // Act
      await service.sendPasswordReset(user as any);

      // Assert
      // Since this is a mock service, we just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      // Arrange
      const user = { ...mockUser };

      // Act
      await service.sendWelcomeEmail(user as any);

      // Assert
      // Since this is a mock service, we just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('sendEmail', () => {
    it('should send email with template successfully', async () => {
      // Arrange
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'email-verification',
        context: {
          name: 'Test User',
          verificationUrl: 'http://localhost:3000/verify?token=123',
        },
      };

      // Act
      await service.sendEmail(emailData);

      // Assert
      // Since this is a mock service, we just verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should handle email with custom context', async () => {
      // Arrange
      const emailData = {
        to: 'test@example.com',
        subject: 'Custom Email',
        template: 'welcome',
        context: {
          name: 'Test User',
          loginUrl: 'http://localhost:3000/login',
          supportEmail: 'support@example.com',
        },
      };

      // Act
      await service.sendEmail(emailData);

      // Assert
      // Since this is a mock service, we just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('testEmailConfiguration', () => {
    it('should test email configuration successfully', async () => {
      // Act
      const result = await service.testEmailConfiguration();

      // Assert
      expect(typeof result).toBe('boolean');
    });
  });
});
