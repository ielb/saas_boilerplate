import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

import { AccountRecoveryService } from './account-recovery.service';
import { User } from '../entities/user.entity';
import { AccountRecovery } from '../entities/account-recovery.entity';
import { EmailService } from '../../email/services/email.service';
import { JwtService } from '../../auth/services/jwt.service';

describe('AccountRecoveryService', () => {
  let service: AccountRecoveryService;
  let userRepository: Repository<User>;
  let accountRecoveryRepository: Repository<AccountRecovery>;
  let emailService: EmailService;
  let jwtService: JwtService;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    twoFactorEnabled: true,
    backupCodes: ['ABCD1234EF', 'GHIJ5678KL', 'MNOP9012QR'],
  };

  const mockRecovery: Partial<AccountRecovery> = {
    id: 'recovery-123',
    userId: 'user-123',
    recoveryToken: 'recovery-token-123',
    recoverySessionToken: 'session-token-123',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    attempts: 0,
    maxAttempts: 3,
    isCompleted: false,
    ipAddress: '127.0.0.1',
    userAgent: 'Test Browser',
    isValid: jest.fn().mockReturnValue(true),
    isExpired: jest.fn().mockReturnValue(false),
    hasExceededAttempts: jest.fn().mockReturnValue(false),
    incrementAttempts: jest.fn(),
    markCompleted: jest.fn(),
    getRemainingAttempts: jest.fn().mockReturnValue(3),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountRecoveryService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AccountRecovery),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              delete: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue({ affected: 5 }),
            })),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendAccountRecoveryEmail: jest.fn(),
            sendAccountRecoveryCompletedEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            generateToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AccountRecoveryService>(AccountRecoveryService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    accountRecoveryRepository = module.get<Repository<AccountRecovery>>(
      getRepositoryToken(AccountRecovery)
    );
    emailService = module.get<EmailService>(EmailService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateRecovery', () => {
    it('should initiate recovery for valid user with MFA enabled', async () => {
      const findOneSpy = jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      const findOneRecoverySpy = jest
        .spyOn(accountRecoveryRepository, 'findOne')
        .mockResolvedValue(null);
      const createSpy = jest
        .spyOn(accountRecoveryRepository, 'create')
        .mockReturnValue(mockRecovery as AccountRecovery);
      const saveSpy = jest
        .spyOn(accountRecoveryRepository, 'save')
        .mockResolvedValue(mockRecovery as AccountRecovery);
      const sendEmailSpy = jest
        .spyOn(emailService, 'sendAccountRecoveryEmail')
        .mockResolvedValue();

      const result = await service.initiateRecovery(
        'test@example.com',
        '127.0.0.1',
        'Test Browser'
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: ['id', 'email', 'firstName', 'lastName', 'twoFactorEnabled'],
      });
      expect(findOneRecoverySpy).toHaveBeenCalledWith({
        where: { userId: 'user-123', isCompleted: false },
      });
      expect(createSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
      expect(sendEmailSpy).toHaveBeenCalledWith(
        'test@example.com',
        'Test',
        expect.any(String),
        expect.any(Date)
      );
      expect(result.message).toBe(
        'If an account with this email exists, a recovery email has been sent.'
      );
    });

    it('should return generic message for non-existent user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.initiateRecovery('nonexistent@example.com');

      expect(result.message).toBe(
        'If an account with this email exists, a recovery email has been sent.'
      );
    });

    it('should throw BadRequestException for user without MFA enabled', async () => {
      const userWithoutMfa = { ...mockUser, twoFactorEnabled: false };
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(userWithoutMfa as User);

      await expect(
        service.initiateRecovery('test@example.com')
      ).rejects.toThrow(
        new BadRequestException(
          'Account recovery is only available for accounts with MFA enabled'
        )
      );
    });

    it('should throw ConflictException for existing active recovery session', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest
        .spyOn(accountRecoveryRepository, 'findOne')
        .mockResolvedValue(mockRecovery as AccountRecovery);

      await expect(
        service.initiateRecovery('test@example.com')
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyRecovery', () => {
    it('should verify recovery with valid token and backup code', async () => {
      const recoveryWithUser = { ...mockRecovery, user: mockUser };
      jest
        .spyOn(accountRecoveryRepository, 'findOne')
        .mockResolvedValue(recoveryWithUser as AccountRecovery);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);

      const result = await service.verifyRecovery(
        'recovery-token-123',
        'ABCD1234EF'
      );

      expect(result).toEqual({
        recoverySessionToken: 'session-token-123',
        expiresAt: expect.any(Date),
        remainingAttempts: 3,
      });
    });

    it('should throw NotFoundException for invalid recovery token', async () => {
      jest.spyOn(accountRecoveryRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.verifyRecovery('invalid-token', 'ABCD1234EF')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for expired recovery session', async () => {
      const expiredRecovery = {
        ...mockRecovery,
        user: mockUser,
        isExpired: jest.fn().mockReturnValue(true),
        isValid: jest.fn().mockReturnValue(false),
      };
      jest
        .spyOn(accountRecoveryRepository, 'findOne')
        .mockResolvedValue(expiredRecovery as unknown as AccountRecovery);

      await expect(
        service.verifyRecovery('recovery-token-123', 'ABCD1234EF')
      ).rejects.toThrow(
        new BadRequestException('Recovery session has expired')
      );
    });

    it('should throw UnauthorizedException for invalid backup code', async () => {
      const recoveryWithUser = { ...mockRecovery, user: mockUser };
      jest
        .spyOn(accountRecoveryRepository, 'findOne')
        .mockResolvedValue(recoveryWithUser as AccountRecovery);
      jest
        .spyOn(accountRecoveryRepository, 'save')
        .mockResolvedValue(mockRecovery as AccountRecovery);

      await expect(
        service.verifyRecovery('recovery-token-123', 'INVALID-CODE')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('completeRecovery', () => {
    it('should complete recovery and reset MFA', async () => {
      const recoveryWithUser = { ...mockRecovery, user: mockUser };
      jest
        .spyOn(accountRecoveryRepository, 'findOne')
        .mockResolvedValue(recoveryWithUser as AccountRecovery);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest
        .spyOn(accountRecoveryRepository, 'save')
        .mockResolvedValue(mockRecovery as AccountRecovery);
      jest
        .spyOn(emailService, 'sendAccountRecoveryCompletedEmail')
        .mockResolvedValue();

      const result = await service.completeRecovery('session-token-123');

      expect(result).toEqual({
        secret: expect.any(String),
        qrCode: expect.any(String),
        backupCodes: expect.arrayContaining([expect.any(String)]),
      });
      expect(
        emailService.sendAccountRecoveryCompletedEmail
      ).toHaveBeenCalledWith('test@example.com', 'Test');
    });

    it('should throw NotFoundException for invalid recovery session', async () => {
      jest.spyOn(accountRecoveryRepository, 'findOne').mockResolvedValue(null);

      await expect(service.completeRecovery('invalid-session')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getRecoveryStatus', () => {
    it('should return recovery status for valid session', async () => {
      jest
        .spyOn(accountRecoveryRepository, 'findOne')
        .mockResolvedValue(mockRecovery as AccountRecovery);

      const result = await service.getRecoveryStatus('session-token-123');

      expect(result).toEqual({
        isRecoveryInProgress: true,
        recoverySessionExpiresAt: expect.any(String),
        remainingAttempts: 3,
      });
    });

    it('should return inactive status for non-existent session', async () => {
      jest.spyOn(accountRecoveryRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getRecoveryStatus('invalid-session');

      expect(result).toEqual({
        isRecoveryInProgress: false,
        recoverySessionExpiresAt: '',
        remainingAttempts: 0,
      });
    });
  });

  describe('cleanupExpiredRecoveries', () => {
    it('should clean up expired recovery sessions', async () => {
      const result = await service.cleanupExpiredRecoveries();

      expect(result).toBe(5);
    });
  });
});
