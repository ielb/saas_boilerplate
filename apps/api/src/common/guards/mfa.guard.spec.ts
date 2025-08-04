import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MfaGuard } from './mfa.guard';
import { MFA_REQUIRED_KEY } from '../decorators/auth.decorator';

describe('MfaGuard', () => {
  let guard: MfaGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<MfaGuard>(MfaGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no MFA is required', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: '1', mfaEnabled: true, mfaVerified: false },
        }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should allow access when MFA is required and user has MFA disabled', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: '1', mfaEnabled: false, mfaVerified: false },
        }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should allow access when MFA is required and user has MFA verified', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: '1', mfaEnabled: true, mfaVerified: true },
        }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should deny access when MFA is required but user has MFA enabled but not verified', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: '1', mfaEnabled: true, mfaVerified: false },
          method: 'GET',
          url: '/test',
        }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should deny access when MFA is required but user is not authenticated', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: null,
        }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
