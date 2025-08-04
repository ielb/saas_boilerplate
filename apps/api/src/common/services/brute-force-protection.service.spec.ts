import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  BruteForceProtectionService,
  BruteForceType,
} from './brute-force-protection.service';

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  incr: jest.fn(),
  ttl: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
};

// Mock the entire ioredis module
jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockRedis),
  };
});

describe('BruteForceProtectionService', () => {
  let service: BruteForceProtectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BruteForceProtectionService],
    }).compile();

    service = module.get<BruteForceProtectionService>(
      BruteForceProtectionService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isBlocked', () => {
    it('should return true when identifier is blocked', async () => {
      const identifier = '127.0.0.1:Test Browser';
      const type: BruteForceType = 'login';

      mockRedis.get.mockResolvedValue('blocked');

      const result = await service.isBlocked(identifier, type);

      expect(result).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(
        'brute_force_login:blocked:127.0.0.1:Test Browser'
      );
    });

    it('should return false when identifier is not blocked', async () => {
      const identifier = '127.0.0.1:Test Browser';
      const type: BruteForceType = 'login';

      mockRedis.get.mockResolvedValue(null);

      const result = await service.isBlocked(identifier, type);

      expect(result).toBe(false);
    });
  });

  describe('getRemainingLockoutTime', () => {
    it('should return remaining lockout time', async () => {
      const identifier = '127.0.0.1:Test Browser';
      const type: BruteForceType = 'login';

      mockRedis.ttl.mockResolvedValue(1800); // 30 minutes

      const result = await service.getRemainingLockoutTime(identifier, type);

      expect(result).toBe(1800);
      expect(mockRedis.ttl).toHaveBeenCalledWith(
        'brute_force_login:blocked:127.0.0.1:Test Browser'
      );
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment failed attempts counter', async () => {
      const identifier = '127.0.0.1:Test Browser';
      const type: BruteForceType = 'login';

      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await service.recordFailedAttempt(identifier, type);

      expect(mockRedis.incr).toHaveBeenCalledWith(
        'brute_force_login:attempts:127.0.0.1:Test Browser'
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'brute_force_login:attempts:127.0.0.1:Test Browser',
        900 // 15 minutes in seconds
      );
    });

    it('should block identifier when max attempts reached', async () => {
      const identifier = '127.0.0.1:Test Browser';
      const type: BruteForceType = 'login';

      mockRedis.incr.mockResolvedValue(5); // Max attempts reached
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.setex.mockResolvedValue('OK');

      const loggerSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      await service.recordFailedAttempt(identifier, type);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'brute_force_login:blocked:127.0.0.1:Test Browser',
        1800, // 30 minutes
        'blocked'
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'Brute force protection: 127.0.0.1:Test Browser blocked for login after 5 failed attempts'
      );

      loggerSpy.mockRestore();
    });

    it('should not block identifier when under max attempts', async () => {
      const identifier = '127.0.0.1:Test Browser';
      const type: BruteForceType = 'login';

      mockRedis.incr.mockResolvedValue(3); // Under max attempts
      mockRedis.expire.mockResolvedValue(1);

      await service.recordFailedAttempt(identifier, type);

      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('recordSuccessfulAttempt', () => {
    it('should reset counters on successful attempt', async () => {
      const identifier = '127.0.0.1:Test Browser';
      const type: BruteForceType = 'login';

      mockRedis.del.mockResolvedValue(1);

      const loggerSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();

      await service.recordSuccessfulAttempt(identifier, type);

      expect(mockRedis.del).toHaveBeenCalledWith(
        'brute_force_login:attempts:127.0.0.1:Test Browser'
      );
      expect(mockRedis.del).toHaveBeenCalledWith(
        'brute_force_login:blocked:127.0.0.1:Test Browser'
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'Brute force protection: 127.0.0.1:Test Browser successful attempt for login, counters reset'
      );

      loggerSpy.mockRestore();
    });
  });

  describe('getFailedAttempts', () => {
    it('should return current failed attempts count', async () => {
      const identifier = '127.0.0.1:Test Browser';
      const type: BruteForceType = 'login';

      mockRedis.get.mockResolvedValue('3');

      const result = await service.getFailedAttempts(identifier, type);

      expect(result).toBe(3);
      expect(mockRedis.get).toHaveBeenCalledWith(
        'brute_force_login:attempts:127.0.0.1:Test Browser'
      );
    });

    it('should return 0 when no failed attempts', async () => {
      const identifier = '127.0.0.1:Test Browser';
      const type: BruteForceType = 'login';

      mockRedis.get.mockResolvedValue(null);

      const result = await service.getFailedAttempts(identifier, type);

      expect(result).toBe(0);
    });
  });

  describe('blockIdentifier', () => {
    it('should manually block identifier', async () => {
      const identifier = '127.0.0.1:Test Browser';
      const type: BruteForceType = 'login';
      const duration = 3600; // 1 hour

      mockRedis.setex.mockResolvedValue('OK');

      const loggerSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      await service.blockIdentifier(identifier, type, duration);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'brute_force_login:blocked:127.0.0.1:Test Browser',
        duration,
        'blocked'
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'Brute force protection: 127.0.0.1:Test Browser manually blocked for login for 3600 seconds'
      );

      loggerSpy.mockRestore();
    });

    it('should use default duration when not specified', async () => {
      const identifier = '127.0.0.1:Test Browser';
      const type: BruteForceType = 'login';

      mockRedis.setex.mockResolvedValue('OK');

      await service.blockIdentifier(identifier, type);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'brute_force_login:blocked:127.0.0.1:Test Browser',
        1800, // Default 30 minutes
        'blocked'
      );
    });
  });

  describe('unblockIdentifier', () => {
    it('should manually unblock identifier', async () => {
      const identifier = '127.0.0.1:Test Browser';
      const type: BruteForceType = 'login';

      mockRedis.del.mockResolvedValue(1);

      const loggerSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();

      await service.unblockIdentifier(identifier, type);

      expect(mockRedis.del).toHaveBeenCalledWith(
        'brute_force_login:blocked:127.0.0.1:Test Browser'
      );
      expect(mockRedis.del).toHaveBeenCalledWith(
        'brute_force_login:attempts:127.0.0.1:Test Browser'
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'Brute force protection: 127.0.0.1:Test Browser manually unblocked for login'
      );

      loggerSpy.mockRestore();
    });
  });

  describe('getStatistics', () => {
    it('should return brute force statistics', async () => {
      const type: BruteForceType = 'login';

      mockRedis.keys.mockResolvedValueOnce(['blocked1', 'blocked2']); // 2 blocked
      mockRedis.keys.mockResolvedValueOnce([
        'attempts1',
        'attempts2',
        'attempts3',
      ]); // 3 attempt keys
      mockRedis.get.mockResolvedValueOnce('5'); // 5 attempts
      mockRedis.get.mockResolvedValueOnce('3'); // 3 attempts
      mockRedis.get.mockResolvedValueOnce('2'); // 2 attempts

      const result = await service.getStatistics(type);

      expect(result).toEqual({
        blockedCount: 2,
        totalAttempts: 10, // 5 + 3 + 2
      });
    });

    it('should handle empty statistics', async () => {
      const type: BruteForceType = 'login';

      mockRedis.keys.mockResolvedValueOnce([]); // No blocked
      mockRedis.keys.mockResolvedValueOnce([]); // No attempts

      const result = await service.getStatistics(type);

      expect(result).toEqual({
        blockedCount: 0,
        totalAttempts: 0,
      });
    });
  });

  describe('cleanup', () => {
    it('should log cleanup completion', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();

      await service.cleanup();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Brute force protection cleanup completed'
      );

      loggerSpy.mockRestore();
    });
  });

  describe('configuration', () => {
    it('should have correct configuration for login', () => {
      const configs = (service as any).configs;

      expect(configs.login).toEqual({
        maxAttempts: 5,
        lockoutDuration: 30 * 60, // 30 minutes
        windowMs: 15 * 60 * 1000, // 15 minutes
        keyPrefix: 'brute_force_login',
      });
    });

    it('should have correct configuration for register', () => {
      const configs = (service as any).configs;

      expect(configs.register).toEqual({
        maxAttempts: 3,
        lockoutDuration: 60 * 60, // 1 hour
        windowMs: 60 * 60 * 1000, // 1 hour
        keyPrefix: 'brute_force_register',
      });
    });

    it('should have correct configuration for passwordReset', () => {
      const configs = (service as any).configs;

      expect(configs.passwordReset).toEqual({
        maxAttempts: 3,
        lockoutDuration: 60 * 60, // 1 hour
        windowMs: 60 * 60 * 1000, // 1 hour
        keyPrefix: 'brute_force_password_reset',
      });
    });

    it('should have correct configuration for mfa', () => {
      const configs = (service as any).configs;

      expect(configs.mfa).toEqual({
        maxAttempts: 10,
        lockoutDuration: 15 * 60, // 15 minutes
        windowMs: 5 * 60 * 1000, // 5 minutes
        keyPrefix: 'brute_force_mfa',
      });
    });
  });
});
