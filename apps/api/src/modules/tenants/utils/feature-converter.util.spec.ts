import { TenantFeature } from '../entities/tenant-feature-flag.entity';
import {
  convertFeatureToEnum,
  getValidFeatures,
  isValidFeature,
} from './feature-converter.util';

describe('FeatureConverterUtil', () => {
  describe('convertFeatureToEnum', () => {
    it('should convert snake_case feature names to enum values', () => {
      expect(convertFeatureToEnum('mfa_enforcement')).toBe(
        TenantFeature.MFA_ENFORCEMENT
      );
      expect(convertFeatureToEnum('sso_integration')).toBe(
        TenantFeature.SSO_INTEGRATION
      );
      expect(convertFeatureToEnum('password_policy')).toBe(
        TenantFeature.PASSWORD_POLICY
      );
    });

    it('should convert UPPER_CASE feature names to enum values', () => {
      expect(convertFeatureToEnum('MFA_ENFORCEMENT')).toBe(
        TenantFeature.MFA_ENFORCEMENT
      );
      expect(convertFeatureToEnum('SSO_INTEGRATION')).toBe(
        TenantFeature.SSO_INTEGRATION
      );
      expect(convertFeatureToEnum('PASSWORD_POLICY')).toBe(
        TenantFeature.PASSWORD_POLICY
      );
    });

    it('should return null for invalid feature names', () => {
      expect(convertFeatureToEnum('invalid_feature')).toBeNull();
      expect(convertFeatureToEnum('nonexistent')).toBeNull();
      expect(convertFeatureToEnum('')).toBeNull();
    });

    it('should handle all TenantFeature enum values', () => {
      const allFeatures = Object.values(TenantFeature);
      allFeatures.forEach(feature => {
        expect(convertFeatureToEnum(feature)).toBe(feature);
      });
    });

    it('should be case insensitive for valid features', () => {
      expect(convertFeatureToEnum('Mfa_Enforcement')).toBe(
        TenantFeature.MFA_ENFORCEMENT
      );
      expect(convertFeatureToEnum('mfa_ENFORCEMENT')).toBe(
        TenantFeature.MFA_ENFORCEMENT
      );
      expect(convertFeatureToEnum('MFA_enforcement')).toBe(
        TenantFeature.MFA_ENFORCEMENT
      );
    });
  });

  describe('getValidFeatures', () => {
    it('should return all TenantFeature enum values', () => {
      const validFeatures = getValidFeatures();
      const enumValues = Object.values(TenantFeature);
      expect(validFeatures).toEqual(enumValues);
    });

    it('should return array of strings', () => {
      const validFeatures = getValidFeatures();
      expect(Array.isArray(validFeatures)).toBe(true);
      validFeatures.forEach(feature => {
        expect(typeof feature).toBe('string');
      });
    });
  });

  describe('isValidFeature', () => {
    it('should return true for valid feature names', () => {
      expect(isValidFeature('mfa_enforcement')).toBe(true);
      expect(isValidFeature('MFA_ENFORCEMENT')).toBe(true);
      expect(isValidFeature('sso_integration')).toBe(true);
    });

    it('should return false for invalid feature names', () => {
      expect(isValidFeature('invalid_feature')).toBe(false);
      expect(isValidFeature('')).toBe(false);
      expect(isValidFeature('nonexistent')).toBe(false);
    });

    it('should be consistent with convertFeatureToEnum', () => {
      const testFeatures = [
        'mfa_enforcement',
        'invalid_feature',
        'sso_integration',
        'nonexistent',
      ];

      testFeatures.forEach(feature => {
        const enumValue = convertFeatureToEnum(feature);
        const isValid = isValidFeature(feature);
        expect(isValid).toBe(enumValue !== null);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(convertFeatureToEnum(null as any)).toBeNull();
      expect(convertFeatureToEnum(undefined as any)).toBeNull();
      expect(isValidFeature(null as any)).toBe(false);
      expect(isValidFeature(undefined as any)).toBe(false);
    });

    it('should handle special characters in feature names', () => {
      expect(convertFeatureToEnum('mfa_enforcement!')).toBeNull();
      expect(convertFeatureToEnum('mfa-enforcement')).toBeNull();
      expect(convertFeatureToEnum('mfa.enforcement')).toBeNull();
    });

    it('should handle whitespace in feature names', () => {
      expect(convertFeatureToEnum(' mfa_enforcement ')).toBeNull();
      expect(convertFeatureToEnum('mfa_enforcement ')).toBeNull();
      expect(convertFeatureToEnum(' mfa_enforcement')).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should handle large number of feature checks efficiently', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        convertFeatureToEnum('mfa_enforcement');
        convertFeatureToEnum('invalid_feature');
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});
