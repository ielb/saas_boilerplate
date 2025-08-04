import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/auth.decorator';
import { UserRole } from '@app/shared';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: '1', role: UserRole.MEMBER },
        }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should allow access when user has required role', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: '1', role: UserRole.ADMIN },
        }),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN]);

    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should allow access when user has one of multiple required roles', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: '1', role: UserRole.MANAGER },
        }),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN, UserRole.MANAGER]);

    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should deny access when user does not have required role', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: '1', role: UserRole.MEMBER },
          method: 'GET',
          url: '/test',
        }),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should deny access when user is not authenticated', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: null,
        }),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
