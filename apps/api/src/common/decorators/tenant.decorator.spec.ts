import {
  TenantId,
  Tenant,
  TenantContext,
  TenantField,
  TenantName,
  TenantDomain,
  TenantPlan,
  TenantFeatures,
} from './tenant.decorator';

describe('Tenant Decorators', () => {
  describe('Decorator Exports', () => {
    it('should export TenantId decorator', () => {
      expect(TenantId).toBeDefined();
      expect(typeof TenantId).toBe('function');
    });

    it('should export Tenant decorator', () => {
      expect(Tenant).toBeDefined();
      expect(typeof Tenant).toBe('function');
    });

    it('should export TenantContext decorator', () => {
      expect(TenantContext).toBeDefined();
      expect(typeof TenantContext).toBe('function');
    });

    it('should export TenantField decorator factory', () => {
      expect(TenantField).toBeDefined();
      expect(typeof TenantField).toBe('function');
    });

    it('should export TenantName decorator', () => {
      expect(TenantName).toBeDefined();
      expect(typeof TenantName).toBe('function');
    });

    it('should export TenantDomain decorator', () => {
      expect(TenantDomain).toBeDefined();
      expect(typeof TenantDomain).toBe('function');
    });

    it('should export TenantPlan decorator', () => {
      expect(TenantPlan).toBeDefined();
      expect(typeof TenantPlan).toBe('function');
    });

    it('should export TenantFeatures decorator', () => {
      expect(TenantFeatures).toBeDefined();
      expect(typeof TenantFeatures).toBe('function');
    });
  });

  describe('TenantField Factory', () => {
    it('should create a decorator function when called with a field name', () => {
      const decorator = TenantField('name');
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create different decorators for different field names', () => {
      const nameDecorator = TenantField('name');
      const domainDecorator = TenantField('domain');

      expect(nameDecorator).not.toBe(domainDecorator);
      expect(typeof nameDecorator).toBe('function');
      expect(typeof domainDecorator).toBe('function');
    });
  });
});
