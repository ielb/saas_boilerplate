import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import {
  TenantScopingInterceptor,
  getCurrentTenantId,
  requireTenantContext,
  hasTenantContext,
} from './tenant-scoping.interceptor';
import { TenantRequest } from '../middleware/tenant-isolation.middleware';

// Create a mock request type that extends TenantRequest
type MockTenantRequest = Partial<TenantRequest> & {
  method: string;
  url: string;
  get: jest.Mock;
  tenantId?: string;
};

describe('TenantScopingInterceptor', () => {
  let interceptor: TenantScopingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantScopingInterceptor],
    }).compile();

    interceptor = module.get<TenantScopingInterceptor>(
      TenantScopingInterceptor
    );
  });

  beforeEach(() => {
    mockCallHandler = {
      handle: jest.fn(),
    } as CallHandler;
  });

  afterEach(() => {
    // Clean up global tenant context
    delete (global as any).__currentTenantId;
  });

  describe('intercept', () => {
    it('should set tenant context when tenant ID exists', done => {
      const mockRequest: MockTenantRequest = {
        method: 'GET',
        url: '/test',
        tenantId: 'tenant-123',
        get: jest.fn(),
      };

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const testData = { message: 'test' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: result => {
          expect(result).toEqual(testData);
          expect((global as any).__currentTenantId).toBe('tenant-123');
          done();
        },
        error: done,
      });
    });

    it('should not set tenant context when no tenant ID exists', done => {
      const mockRequest: MockTenantRequest = {
        method: 'GET',
        url: '/test',
        get: jest.fn(),
      };

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const testData = { message: 'test' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: result => {
          expect(result).toEqual(testData);
          expect((global as any).__currentTenantId).toBeUndefined();
          done();
        },
        error: done,
      });
    });

    it('should handle errors gracefully', done => {
      const mockRequest: MockTenantRequest = {
        method: 'GET',
        url: '/test',
        tenantId: 'tenant-123',
        get: jest.fn(),
      };

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const testError = new Error('Test error');
      mockCallHandler.handle = jest.fn().mockReturnValue(of(testError));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: result => {
          expect(result).toEqual(testError);
          expect((global as any).__currentTenantId).toBe('tenant-123');
          done();
        },
        error: done,
      });
    });
  });

  describe('getCurrentTenantId', () => {
    it('should return tenant ID when set', () => {
      (global as any).__currentTenantId = 'tenant-123';
      expect(getCurrentTenantId()).toBe('tenant-123');
    });

    it('should return null when not set', () => {
      (global as any).__currentTenantId = undefined;
      expect(getCurrentTenantId()).toBeNull();
    });

    it('should return null when global context is not available', () => {
      delete (global as any).__currentTenantId;
      expect(getCurrentTenantId()).toBeNull();
    });
  });

  describe('requireTenantContext', () => {
    it('should return tenant ID when available', () => {
      (global as any).__currentTenantId = 'tenant-123';
      expect(requireTenantContext()).toBe('tenant-123');
    });

    it('should throw ForbiddenException when tenant context is not available', () => {
      (global as any).__currentTenantId = undefined;
      expect(() => requireTenantContext()).toThrow('Tenant context required');
    });

    it('should throw ForbiddenException when global context is not available', () => {
      delete (global as any).__currentTenantId;
      expect(() => requireTenantContext()).toThrow('Tenant context required');
    });
  });

  describe('hasTenantContext', () => {
    it('should return true when tenant context is available', () => {
      (global as any).__currentTenantId = 'tenant-123';
      expect(hasTenantContext()).toBe(true);
    });

    it('should return false when tenant context is not available', () => {
      (global as any).__currentTenantId = undefined;
      expect(hasTenantContext()).toBe(false);
    });

    it('should return false when global context is not available', () => {
      delete (global as any).__currentTenantId;
      expect(hasTenantContext()).toBe(false);
    });

    it('should return false when tenant context is null', () => {
      (global as any).__currentTenantId = null;
      expect(hasTenantContext()).toBe(false);
    });

    it('should return false when tenant context is empty string', () => {
      (global as any).__currentTenantId = '';
      expect(hasTenantContext()).toBe(false);
    });
  });
});
