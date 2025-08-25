import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { AccountRecoveryController } from './account-recovery.controller';
import { AccountRecoveryService } from '../services/account-recovery.service';
import { TwoFactorAuthSetup } from '@app/shared';

describe('AccountRecoveryController', () => {
  let controller: AccountRecoveryController;
  let accountRecoveryService: AccountRecoveryService;

  const mockRequest = {
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    headers: { 'user-agent': 'Test Browser' },
  } as Request;

  const mockRecoverySession = {
    recoverySessionToken: 'session-token-123',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    remainingAttempts: 3,
  };

  const mockRecoverySetup: TwoFactorAuthSetup = {
    secret: 'JBSWY3DPEHPK3PXP',
    qrCode:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    backupCodes: ['ABCD1234EF', 'GHIJ5678KL', 'MNOP9012QR'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [AccountRecoveryController],
      providers: [
        {
          provide: AccountRecoveryService,
          useValue: {
            initiateRecovery: jest.fn(),
            verifyRecovery: jest.fn(),
            completeRecovery: jest.fn(),
            getRecoveryStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AccountRecoveryController>(
      AccountRecoveryController
    );
    accountRecoveryService = module.get<AccountRecoveryService>(
      AccountRecoveryService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateRecovery', () => {
    it('should initiate account recovery successfully', async () => {
      const initiateDto = { email: 'test@example.com' };
      const expectedResponse = {
        message:
          'If an account with this email exists, a recovery email has been sent.',
      };

      jest
        .spyOn(accountRecoveryService, 'initiateRecovery')
        .mockResolvedValue(expectedResponse);

      const result = await controller.initiateRecovery(
        initiateDto,
        mockRequest
      );

      expect(accountRecoveryService.initiateRecovery).toHaveBeenCalledWith(
        'test@example.com',
        '127.0.0.1',
        'Test Browser'
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle missing IP address', async () => {
      const requestWithoutIp = { ...mockRequest, ip: undefined } as Request;
      const initiateDto = { email: 'test@example.com' };
      const expectedResponse = {
        message:
          'If an account with this email exists, a recovery email has been sent.',
      };

      jest
        .spyOn(accountRecoveryService, 'initiateRecovery')
        .mockResolvedValue(expectedResponse);

      const result = await controller.initiateRecovery(
        initiateDto,
        requestWithoutIp
      );

      expect(accountRecoveryService.initiateRecovery).toHaveBeenCalledWith(
        'test@example.com',
        '127.0.0.1',
        'Test Browser'
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('verifyRecovery', () => {
    it('should verify recovery successfully', async () => {
      const verifyDto = {
        recoveryToken: 'recovery-token-123',
        backupCode: 'ABCD1234EF',
      };

      jest
        .spyOn(accountRecoveryService, 'verifyRecovery')
        .mockResolvedValue(mockRecoverySession);

      const result = await controller.verifyRecovery(verifyDto);

      expect(accountRecoveryService.verifyRecovery).toHaveBeenCalledWith(
        'recovery-token-123',
        'ABCD1234EF'
      );
      expect(result).toEqual({
        recoverySessionToken: 'session-token-123',
        expiresAt: mockRecoverySession.expiresAt.toISOString(),
        remainingAttempts: 3,
      });
    });

    it('should handle verification errors', async () => {
      const verifyDto = {
        recoveryToken: 'invalid-token',
        backupCode: 'INVALID-CODE',
      };

      jest
        .spyOn(accountRecoveryService, 'verifyRecovery')
        .mockRejectedValue(new UnauthorizedException('Invalid backup code'));

      await expect(controller.verifyRecovery(verifyDto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('completeRecovery', () => {
    it('should complete recovery successfully', async () => {
      const completeDto = {
        recoverySessionToken: 'session-token-123',
      };

      jest
        .spyOn(accountRecoveryService, 'completeRecovery')
        .mockResolvedValue(mockRecoverySetup);

      const result = await controller.completeRecovery(completeDto);

      expect(accountRecoveryService.completeRecovery).toHaveBeenCalledWith(
        'session-token-123',
        undefined
      );
      expect(result).toEqual(mockRecoverySetup);
    });

    it('should complete recovery with custom TOTP secret', async () => {
      const completeDto = {
        recoverySessionToken: 'session-token-123',
        newTotpSecret: 'CUSTOM_SECRET',
      };

      jest
        .spyOn(accountRecoveryService, 'completeRecovery')
        .mockResolvedValue(mockRecoverySetup);

      const result = await controller.completeRecovery(completeDto);

      expect(accountRecoveryService.completeRecovery).toHaveBeenCalledWith(
        'session-token-123',
        'CUSTOM_SECRET'
      );
      expect(result).toEqual(mockRecoverySetup);
    });

    it('should handle completion errors', async () => {
      const completeDto = {
        recoverySessionToken: 'invalid-session',
      };

      jest
        .spyOn(accountRecoveryService, 'completeRecovery')
        .mockRejectedValue(new NotFoundException('Invalid recovery session'));

      await expect(controller.completeRecovery(completeDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getRecoveryStatus', () => {
    it('should get recovery status successfully', async () => {
      const body = { recoverySessionToken: 'session-token-123' };
      const mockStatus = {
        isRecoveryInProgress: true,
        recoverySessionExpiresAt: '2023-12-31T23:59:59Z',
        remainingAttempts: 3,
      };

      jest
        .spyOn(accountRecoveryService, 'getRecoveryStatus')
        .mockResolvedValue(mockStatus);

      const result = await controller.getRecoveryStatus('session-token-123');

      expect(accountRecoveryService.getRecoveryStatus).toHaveBeenCalledWith(
        'session-token-123'
      );
      expect(result).toEqual(mockStatus);
    });

    it('should handle status errors', async () => {
      jest
        .spyOn(accountRecoveryService, 'getRecoveryStatus')
        .mockRejectedValue(new NotFoundException('Recovery session not found'));

      await expect(
        controller.getRecoveryStatus('invalid-session')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('attemptBackupCode', () => {
    it('should attempt backup code verification', async () => {
      const attemptDto = {
        recoverySessionToken: 'session-token-123',
        backupCode: 'ABCD1234EF',
      };
      const mockStatus = {
        isRecoveryInProgress: true,
        recoverySessionExpiresAt: '2023-12-31T23:59:59Z',
        remainingAttempts: 2,
      };

      jest
        .spyOn(accountRecoveryService, 'getRecoveryStatus')
        .mockResolvedValue(mockStatus);

      const result = await controller.attemptBackupCode(attemptDto);

      expect(accountRecoveryService.getRecoveryStatus).toHaveBeenCalledWith(
        'session-token-123'
      );
      expect(result).toEqual({
        isValid: false,
        remainingAttempts: 2,
      });
    });

    it('should handle inactive recovery session', async () => {
      const attemptDto = {
        recoverySessionToken: 'expired-session',
        backupCode: 'ABCD1234EF',
      };
      const mockStatus = {
        isRecoveryInProgress: false,
        recoverySessionExpiresAt: '',
        remainingAttempts: 0,
      };

      jest
        .spyOn(accountRecoveryService, 'getRecoveryStatus')
        .mockResolvedValue(mockStatus);

      const result = await controller.attemptBackupCode(attemptDto);

      expect(result).toEqual({
        isValid: false,
        remainingAttempts: 0,
      });
    });

    it('should handle errors gracefully', async () => {
      const attemptDto = {
        recoverySessionToken: 'invalid-session',
        backupCode: 'ABCD1234EF',
      };

      jest
        .spyOn(accountRecoveryService, 'getRecoveryStatus')
        .mockRejectedValue(new Error('Database error'));

      const result = await controller.attemptBackupCode(attemptDto);

      expect(result).toEqual({
        isValid: false,
        remainingAttempts: 0,
      });
    });
  });
});
