import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { JwtService } from '../../modules/auth/services/jwt.service';
import {
  IS_PUBLIC_KEY,
  SKIP_AUTH_KEY,
  ROLES_KEY,
  TENANT_REQUIRED_KEY,
  MFA_REQUIRED_KEY,
} from '../decorators/auth.decorator';
import { UserRole } from '@app/shared';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: Reflector;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            validateTokenFormat: jest.fn(),
            getTokenType: jest.fn(),
            isTokenExpired: jest.fn(),
            verifyAccessToken: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    reflector = module.get<Reflector>(Reflector);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access for public routes', async () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(true) // IS_PUBLIC_KEY
      .mockReturnValueOnce(false); // SKIP_AUTH_KEY

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should allow access for routes that skip auth', async () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false) // IS_PUBLIC_KEY
      .mockReturnValueOnce(true); // SKIP_AUTH_KEY

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException when no token is provided', async () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false) // IS_PUBLIC_KEY
      .mockReturnValueOnce(false); // SKIP_AUTH_KEY

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('should validate token and set user when valid token is provided', async () => {
    const mockUser = {
      sub: 'user-1',
      email: 'test@example.com',
      role: UserRole.MEMBER,
      tenantId: 'tenant-1',
    };

    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: { authorization: 'Bearer valid-token' },
          user: null,
        }),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false) // IS_PUBLIC_KEY
      .mockReturnValueOnce(false) // SKIP_AUTH_KEY
      .mockReturnValueOnce(undefined) // ROLES_KEY
      .mockReturnValueOnce(undefined) // TENANT_REQUIRED_KEY
      .mockReturnValueOnce(undefined); // MFA_REQUIRED_KEY

    jest.spyOn(jwtService, 'validateTokenFormat').mockReturnValue(true);
    jest.spyOn(jwtService, 'getTokenType').mockReturnValue('access');
    jest.spyOn(jwtService, 'isTokenExpired').mockReturnValue(false);
    jest.spyOn(jwtService, 'verifyAccessToken').mockReturnValue(mockUser);

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should check roles when required', async () => {
    const mockUser = {
      sub: 'user-1',
      email: 'test@example.com',
      role: UserRole.ADMIN,
      tenantId: 'tenant-1',
    };

    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: { authorization: 'Bearer valid-token' },
          user: null,
        }),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false) // IS_PUBLIC_KEY
      .mockReturnValueOnce(false) // SKIP_AUTH_KEY
      .mockReturnValueOnce([UserRole.ADMIN]) // ROLES_KEY
      .mockReturnValueOnce(undefined) // TENANT_REQUIRED_KEY
      .mockReturnValueOnce(undefined); // MFA_REQUIRED_KEY

    jest.spyOn(jwtService, 'validateTokenFormat').mockReturnValue(true);
    jest.spyOn(jwtService, 'getTokenType').mockReturnValue('access');
    jest.spyOn(jwtService, 'isTokenExpired').mockReturnValue(false);
    jest.spyOn(jwtService, 'verifyAccessToken').mockReturnValue(mockUser);

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user does not have required role', async () => {
    const mockUser = {
      sub: 'user-1',
      email: 'test@example.com',
      role: UserRole.MEMBER,
      tenantId: 'tenant-1',
    };

    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: { authorization: 'Bearer valid-token' },
          user: null,
          method: 'GET',
          url: '/test',
        }),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false) // IS_PUBLIC_KEY
      .mockReturnValueOnce(false) // SKIP_AUTH_KEY
      .mockReturnValueOnce([UserRole.ADMIN]) // ROLES_KEY
      .mockReturnValueOnce(undefined) // TENANT_REQUIRED_KEY
      .mockReturnValueOnce(undefined); // MFA_REQUIRED_KEY

    jest.spyOn(jwtService, 'validateTokenFormat').mockReturnValue(true);
    jest.spyOn(jwtService, 'getTokenType').mockReturnValue('access');
    jest.spyOn(jwtService, 'isTokenExpired').mockReturnValue(false);
    jest.spyOn(jwtService, 'verifyAccessToken').mockReturnValue(mockUser);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      ForbiddenException
    );
  });

  it('should check tenant when required', async () => {
    const mockUser = {
      sub: 'user-1',
      email: 'test@example.com',
      role: UserRole.MEMBER,
      tenantId: 'tenant-1',
    };

    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: { authorization: 'Bearer valid-token' },
          user: null,
        }),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false) // IS_PUBLIC_KEY
      .mockReturnValueOnce(false) // SKIP_AUTH_KEY
      .mockReturnValueOnce(undefined) // ROLES_KEY
      .mockReturnValueOnce(true) // TENANT_REQUIRED_KEY
      .mockReturnValueOnce(undefined); // MFA_REQUIRED_KEY

    jest.spyOn(jwtService, 'validateTokenFormat').mockReturnValue(true);
    jest.spyOn(jwtService, 'getTokenType').mockReturnValue('access');
    jest.spyOn(jwtService, 'isTokenExpired').mockReturnValue(false);
    jest.spyOn(jwtService, 'verifyAccessToken').mockReturnValue(mockUser);

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when tenant is required but user has no tenant', async () => {
    const mockUser = {
      sub: 'user-1',
      email: 'test@example.com',
      role: UserRole.MEMBER,
      tenantId: '',
    };

    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: { authorization: 'Bearer valid-token' },
          user: null,
          method: 'GET',
          url: '/test',
        }),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false) // IS_PUBLIC_KEY
      .mockReturnValueOnce(false) // SKIP_AUTH_KEY
      .mockReturnValueOnce(undefined) // ROLES_KEY
      .mockReturnValueOnce(true) // TENANT_REQUIRED_KEY
      .mockReturnValueOnce(undefined); // MFA_REQUIRED_KEY

    jest.spyOn(jwtService, 'validateTokenFormat').mockReturnValue(true);
    jest.spyOn(jwtService, 'getTokenType').mockReturnValue('access');
    jest.spyOn(jwtService, 'isTokenExpired').mockReturnValue(false);
    jest.spyOn(jwtService, 'verifyAccessToken').mockReturnValue(mockUser);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      ForbiddenException
    );
  });
});
