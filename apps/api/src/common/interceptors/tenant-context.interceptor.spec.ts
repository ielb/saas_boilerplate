import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { TenantRequest } from '../middleware/tenant-isolation.middleware';

// Create a mock request type that extends TenantRequest
type MockTenantRequest = Partial<TenantRequest> & {
  method: string;
  url: string;
  get: jest.Mock;
  tenantContext?: any;
};

describe('TenantContextInterceptor', () => {
  let interceptor: TenantContextInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantContextInterceptor],
    }).compile();

    interceptor = module.get<TenantContextInterceptor>(
      TenantContextInterceptor
    );
  });

  beforeEach(() => {
    mockCallHandler = {
      handle: jest.fn(),
    } as CallHandler;
  });

  describe('intercept', () => {
    it('should inject tenant context when tenant context exists', done => {
      const mockTenantContext = {
        id: 'tenant-123',
        name: 'Test Tenant',
        domain: 'test.example.com',
        plan: 'pro',
        features: ['feature1', 'feature2'],
      };

      const mockRequest: MockTenantRequest = {
        method: 'GET',
        url: '/test',
        tenantContext: mockTenantContext,
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
          expect(result).toEqual({
            data: testData,
            tenant: {
              id: 'tenant-123',
              name: 'Test Tenant',
              domain: 'test.example.com',
              plan: 'pro',
              features: ['feature1', 'feature2'],
            },
            meta: {
              tenantId: 'tenant-123',
              timestamp: expect.any(String),
            },
          });
          done();
        },
        error: done,
      });
    });

    it('should return data as-is when no tenant context exists', done => {
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
          done();
        },
        error: done,
      });
    });

    it('should preserve existing response structure when data is already wrapped', done => {
      const mockTenantContext = {
        id: 'tenant-123',
        name: 'Test Tenant',
        domain: 'test.example.com',
        plan: 'pro',
        features: ['feature1', 'feature2'],
      };

      const mockRequest: MockTenantRequest = {
        method: 'GET',
        url: '/test',
        tenantContext: mockTenantContext,
        get: jest.fn(),
      };

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const wrappedData = {
        data: { message: 'test' },
        meta: { existingMeta: 'value' },
      };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(wrappedData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: result => {
          expect(result).toEqual({
            data: { message: 'test' },
            tenant: {
              id: 'tenant-123',
              name: 'Test Tenant',
              domain: 'test.example.com',
              plan: 'pro',
              features: ['feature1', 'feature2'],
            },
            meta: {
              existingMeta: 'value',
              tenantId: 'tenant-123',
              timestamp: expect.any(String),
            },
          });
          done();
        },
        error: done,
      });
    });

    it('should handle primitive data types', done => {
      const mockTenantContext = {
        id: 'tenant-123',
        name: 'Test Tenant',
        domain: 'test.example.com',
        plan: 'pro',
        features: ['feature1', 'feature2'],
      };

      const mockRequest: MockTenantRequest = {
        method: 'GET',
        url: '/test',
        tenantContext: mockTenantContext,
        get: jest.fn(),
      };

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const testData = 'simple string';
      mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: result => {
          expect(result).toEqual({
            data: 'simple string',
            tenant: {
              id: 'tenant-123',
              name: 'Test Tenant',
              domain: 'test.example.com',
              plan: 'pro',
              features: ['feature1', 'feature2'],
            },
            meta: {
              tenantId: 'tenant-123',
              timestamp: expect.any(String),
            },
          });
          done();
        },
        error: done,
      });
    });

    it('should handle null and undefined data', done => {
      const mockTenantContext = {
        id: 'tenant-123',
        name: 'Test Tenant',
        domain: 'test.example.com',
        plan: 'pro',
        features: ['feature1', 'feature2'],
      };

      const mockRequest: MockTenantRequest = {
        method: 'GET',
        url: '/test',
        tenantContext: mockTenantContext,
        get: jest.fn(),
      };

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: result => {
          expect(result).toEqual({
            data: null,
            tenant: {
              id: 'tenant-123',
              name: 'Test Tenant',
              domain: 'test.example.com',
              plan: 'pro',
              features: ['feature1', 'feature2'],
            },
            meta: {
              tenantId: 'tenant-123',
              timestamp: expect.any(String),
            },
          });
          done();
        },
        error: done,
      });
    });
  });
});
