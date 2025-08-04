import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  incr: jest.fn(),
  ttl: jest.fn(),
  expire: jest.fn(),
};

// Mock the entire ioredis module
jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockRedis),
  };
});

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        url: '/auth/login',
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Mozilla/5.0 (Test Browser)',
        },
      }),
    }),
  } as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitGuard],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow request when under rate limit', async () => {
      // Mock Redis responses
      mockRedis.get.mockResolvedValueOnce(null); // No block
      mockRedis.get.mockResolvedValueOnce('2'); // Current count: 2
      mockRedis.ttl.mockResolvedValueOnce(300); // 5 minutes remaining

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('should block request when rate limit exceeded', async () => {
      // Mock Redis responses
      mockRedis.get.mockResolvedValueOnce(null); // No block
      mockRedis.get.mockResolvedValueOnce('5'); // Current count: 5 (at limit)
      mockRedis.ttl.mockResolvedValueOnce(300); // 5 minutes remaining

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        HttpException
      );

      await expect(
        guard.canActivate(mockExecutionContext)
      ).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
        response: {
          error: 'Too many requests',
          message: expect.stringContaining('Rate limit exceeded'),
          retryAfter: 300,
        },
      });
    });

    it('should block request when IP is already blocked', async () => {
      // Mock Redis responses
      mockRedis.get.mockResolvedValueOnce('blocked'); // IP is blocked
      mockRedis.ttl.mockResolvedValueOnce(1800); // 30 minutes remaining

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        HttpException
      );

      await expect(
        guard.canActivate(mockExecutionContext)
      ).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
        response: {
          error: 'Too many requests',
          message:
            'Your IP has been temporarily blocked due to excessive requests',
          retryAfter: 1800,
        },
      });
    });

    it('should apply different rate limits for different endpoints', async () => {
      const loginContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: '/auth/login',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'Test Browser' },
          }),
        }),
      } as ExecutionContext;

      const registerContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: '/auth/register',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'Test Browser' },
          }),
        }),
      } as ExecutionContext;

      // Mock successful requests
      mockRedis.get.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue('1');
      mockRedis.ttl.mockResolvedValue(300);

      await guard.canActivate(loginContext);
      await guard.canActivate(registerContext);

      // Verify different keys were used for different endpoints
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('auth_login'),
        expect.any(Number),
        '1'
      );
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('auth_register'),
        expect.any(Number),
        '1'
      );
    });

    it('should use default rate limiting for unknown endpoints', async () => {
      const unknownContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: '/unknown/endpoint',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'Test Browser' },
          }),
        }),
      } as ExecutionContext;

      // Mock successful request
      mockRedis.get.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue('1');
      mockRedis.ttl.mockResolvedValue(300);

      const result = await guard.canActivate(unknownContext);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('default'),
        expect.any(Number),
        '1'
      );
    });

    it('should include user agent in tracker for auth endpoints', async () => {
      const authContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: '/auth/login',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'Mozilla/5.0 (Test Browser)' },
          }),
        }),
      } as ExecutionContext;

      // Mock successful request
      mockRedis.get.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue('1');
      mockRedis.ttl.mockResolvedValue(300);

      await guard.canActivate(authContext);

      // Verify the key includes both IP and user agent
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('127.0.0.1:Mozilla/5.0 (Test Browser)'),
        expect.any(Number),
        '1'
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection error'));

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        'Redis connection error'
      );
    });
  });

  describe('getTracker', () => {
    it('should return IP only for non-auth endpoints', () => {
      const nonAuthContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: '/api/users',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'Test Browser' },
          }),
        }),
      } as ExecutionContext;

      const tracker = (guard as any).getTracker(
        nonAuthContext.switchToHttp().getRequest()
      );

      expect(tracker).toBe('127.0.0.1');
    });

    it('should return IP and user agent for auth endpoints', () => {
      const authContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: '/auth/login',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'Test Browser' },
          }),
        }),
      } as ExecutionContext;

      const tracker = (guard as any).getTracker(
        authContext.switchToHttp().getRequest()
      );

      expect(tracker).toBe('127.0.0.1:Test Browser');
    });
  });
});
