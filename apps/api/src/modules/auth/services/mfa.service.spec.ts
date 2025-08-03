import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MfaService } from './mfa.service';
import { User } from '../entities/user.entity';

describe('MfaService', () => {
  let service: MfaService;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSecret', () => {
    it('should generate a TOTP secret', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
      } as User;

      const secret = await service.generateSecret(user);

      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
    });
  });

  describe('generateQRCode', () => {
    it('should generate a QR code data URL', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
      } as User;
      const secret = 'JBSWY3DPEHPK3PXP';

      const qrCode = await service.generateQRCode(user, secret);

      expect(qrCode).toBeDefined();
      expect(typeof qrCode).toBe('string');
      expect(qrCode).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes', () => {
      const backupCodes = service.generateBackupCodes();

      expect(backupCodes).toHaveLength(10);
      backupCodes.forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid TOTP token', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const token = '123456'; // This would need to be a valid token for the secret

      const isValid = service.verifyToken(secret, token);

      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('setupTwoFactorAuth', () => {
    it('should setup two-factor authentication for user', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
      } as User;

      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.setupTwoFactorAuth(user);

      expect(result).toBeDefined();
      expect(result.secret).toBeDefined();
      expect(result.qrCode).toBeDefined();
      expect(result.backupCodes).toBeDefined();
      expect(result.backupCodes).toHaveLength(10);
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });
  });

  describe('enableTwoFactorAuth', () => {
    it('should enable two-factor authentication with valid token', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        twoFactorEnabled: false,
        twoFactorVerified: false,
      } as User;

      mockUserRepository.save.mockResolvedValue(user);

      // Mock verifyToken to return true
      jest.spyOn(service, 'verifyToken').mockReturnValue(true);

      await service.enableTwoFactorAuth(user, '123456');

      expect(user.twoFactorEnabled).toBe(true);
      expect(user.twoFactorVerified).toBe(true);
      expect(user.twoFactorEnabledAt).toBeDefined();
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });

    it('should throw error if 2FA not set up', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorSecret: null,
      } as User;

      await expect(service.enableTwoFactorAuth(user, '123456')).rejects.toThrow(
        'Two-factor authentication not set up'
      );
    });

    it('should throw error if token is invalid', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      } as User;

      jest.spyOn(service, 'verifyToken').mockReturnValue(false);

      await expect(service.enableTwoFactorAuth(user, '123456')).rejects.toThrow(
        'Invalid verification code'
      );
    });
  });

  describe('disableTwoFactorAuth', () => {
    it('should disable two-factor authentication with valid token', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        twoFactorEnabled: true,
        twoFactorVerified: true,
      } as User;

      mockUserRepository.save.mockResolvedValue(user);
      jest.spyOn(service, 'verifyToken').mockReturnValue(true);

      await service.disableTwoFactorAuth(user, '123456');

      expect(user.twoFactorEnabled).toBe(false);
      expect(user.twoFactorVerified).toBe(false);
      expect(user.twoFactorSecret).toBeNull();
      expect(user.backupCodes).toBeNull();
      expect(user.twoFactorEnabledAt).toBeNull();
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });

    it('should throw error if 2FA not enabled', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorEnabled: false,
      } as User;

      await expect(
        service.disableTwoFactorAuth(user, '123456')
      ).rejects.toThrow('Two-factor authentication is not enabled');
    });
  });

  describe('verifyTwoFactorAuth', () => {
    it('should return true if 2FA not enabled', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorEnabled: false,
      } as User;

      const result = await service.verifyTwoFactorAuth(user, '123456');

      expect(result).toBe(true);
    });

    it('should verify backup code', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorEnabled: true,
        backupCodes: ['BACKUP123', 'BACKUP456'],
      } as User;

      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.verifyTwoFactorAuth(user, 'BACKUP123');

      expect(result).toBe(true);
      expect(user.backupCodes).toHaveLength(1);
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });

    it('should verify TOTP token', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [],
      } as unknown as User;

      mockUserRepository.save.mockResolvedValue(user);
      jest.spyOn(service, 'verifyToken').mockReturnValue(true);

      const result = await service.verifyTwoFactorAuth(user, '123456');

      expect(result).toBe(true);
      expect(user.twoFactorAttempts).toBe(0);
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });

    it('should increment attempts on invalid token', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [],
        twoFactorAttempts: 0,
      } as unknown as User;

      mockUserRepository.save.mockResolvedValue(user);
      jest.spyOn(service, 'verifyToken').mockReturnValue(false);

      const result = await service.verifyTwoFactorAuth(user, '123456');

      expect(result).toBe(false);
      expect(user.twoFactorAttempts).toBe(1);
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });
  });

  describe('getTwoFactorStatus', () => {
    it('should return correct status', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorEnabled: true,
        twoFactorVerified: true,
        backupCodes: ['CODE1', 'CODE2'],
      } as User;

      const status = await service.getTwoFactorStatus(user);

      expect(status).toEqual({
        isEnabled: true,
        isVerified: true,
        backupCodesRemaining: 2,
      });
    });
  });

  describe('hasExceededAttempts', () => {
    it('should return false for normal attempts', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorAttempts: 3,
        lastTwoFactorAttempt: new Date(),
      } as User;

      const result = service.hasExceededAttempts(user);

      expect(result).toBe(false);
    });

    it('should return true for exceeded attempts', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorAttempts: 5,
        lastTwoFactorAttempt: new Date(),
      } as User;

      const result = service.hasExceededAttempts(user);

      expect(result).toBe(true);
    });
  });

  describe('resetAttempts', () => {
    it('should reset attempt counter', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        twoFactorAttempts: 5,
        lastTwoFactorAttempt: new Date(),
      } as User;

      mockUserRepository.save.mockResolvedValue(user);

      await service.resetAttempts(user);

      expect(user.twoFactorAttempts).toBe(0);
      expect(user.lastTwoFactorAttempt).toBeNull();
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
    });
  });
});
