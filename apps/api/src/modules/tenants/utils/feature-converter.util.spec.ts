import { TenantFeature } from '../../auth/entities/tenant-feature-flag.entity';
import {
  convertFeatureToEnum,
  getValidFeatures,
  isValidFeature,
} from './feature-converter.util';

describe('FeatureConverterUtil', () => {
  describe('convertFeatureToEnum', () => {
    it('should convert snake_case feature names to enum values', () => {
      // Arrange
      const inputFeatures = [
        'mfa_enforcement',
        'sso_integration',
        'password_policy',
        'bulk_user_import',
        'advanced_analytics',
        'audit_logging',
      ];

      const expectedEnums = [
        TenantFeature.MFA_ENFORCEMENT,
        TenantFeature.SSO_INTEGRATION,
        TenantFeature.PASSWORD_POLICY,
        TenantFeature.BULK_USER_IMPORT,
        TenantFeature.ADVANCED_ANALYTICS,
        TenantFeature.AUDIT_LOGGING,
      ];

      // Act & Assert
      inputFeatures.forEach((feature, index) => {
        const result = convertFeatureToEnum(feature);
        expect(result).toBe(expectedEnums[index]);
      });
    });

    it('should convert UPPER_CASE feature names to enum values', () => {
      // Arrange
      const inputFeatures = [
        'MFA_ENFORCEMENT',
        'SSO_INTEGRATION',
        'PASSWORD_POLICY',
        'BULK_USER_IMPORT',
        'ADVANCED_ANALYTICS',
        'AUDIT_LOGGING',
      ];

      const expectedEnums = [
        TenantFeature.MFA_ENFORCEMENT,
        TenantFeature.SSO_INTEGRATION,
        TenantFeature.PASSWORD_POLICY,
        TenantFeature.BULK_USER_IMPORT,
        TenantFeature.ADVANCED_ANALYTICS,
        TenantFeature.AUDIT_LOGGING,
      ];

      // Act & Assert
      inputFeatures.forEach((feature, index) => {
        const result = convertFeatureToEnum(feature);
        expect(result).toBe(expectedEnums[index]);
      });
    });

    it('should return null for invalid feature names', () => {
      // Arrange
      const invalidFeatures = [
        'invalid_feature',
        'unknown_feature',
        'test_feature',
        'random_string',
        '',
        '   ',
      ];

      // Act & Assert
      invalidFeatures.forEach(feature => {
        const result = convertFeatureToEnum(feature);
        expect(result).toBeNull();
      });
    });

    it('should handle all TenantFeature enum values', () => {
      // Arrange
      const allFeatures = Object.values(TenantFeature);

      // Act & Assert
      allFeatures.forEach(feature => {
        const result = convertFeatureToEnum(feature);
        expect(result).toBe(feature);
      });
    });

    it('should be case insensitive for valid features', () => {
      // Arrange
      const testCases = [
        { input: 'mfa_enforcement', expected: TenantFeature.MFA_ENFORCEMENT },
        { input: 'MFA_ENFORCEMENT', expected: TenantFeature.MFA_ENFORCEMENT },
        { input: 'Mfa_Enforcement', expected: TenantFeature.MFA_ENFORCEMENT },
        { input: 'mfa_Enforcement', expected: TenantFeature.MFA_ENFORCEMENT },
      ];

      // Act & Assert
      testCases.forEach(({ input, expected }) => {
        const result = convertFeatureToEnum(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('getValidFeatures', () => {
    it('should return all TenantFeature enum values', () => {
      // Act
      const result = getValidFeatures();

      // Assert
      expect(result).toEqual(Object.values(TenantFeature));
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain(TenantFeature.MFA_ENFORCEMENT);
      expect(result).toContain(TenantFeature.SSO_INTEGRATION);
      expect(result).toContain(TenantFeature.ADVANCED_ANALYTICS);
    });

    it('should return array of strings', () => {
      // Act
      const result = getValidFeatures();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      result.forEach(feature => {
        expect(typeof feature).toBe('string');
      });
    });
  });

  describe('isValidFeature', () => {
    it('should return true for valid feature names', () => {
      // Arrange
      const validFeatures = [
        'mfa_enforcement',
        'sso_integration',
        'password_policy',
        'bulk_user_import',
        'advanced_analytics',
        'audit_logging',
        'MFA_ENFORCEMENT',
        'SSO_INTEGRATION',
      ];

      // Act & Assert
      validFeatures.forEach(feature => {
        const result = isValidFeature(feature);
        expect(result).toBe(true);
      });
    });

    it('should return false for invalid feature names', () => {
      // Arrange
      const invalidFeatures = [
        'invalid_feature',
        'unknown_feature',
        'test_feature',
        'random_string',
        '',
        '   ',
        'mfa_enforcement_invalid',
        'sso_integration_test',
      ];

      // Act & Assert
      invalidFeatures.forEach(feature => {
        const result = isValidFeature(feature);
        expect(result).toBe(false);
      });
    });

    it('should be consistent with convertFeatureToEnum', () => {
      // Arrange
      const testFeatures = [
        'mfa_enforcement',
        'sso_integration',
        'invalid_feature',
        'advanced_analytics',
        'unknown_feature',
      ];

      // Act & Assert
      testFeatures.forEach(feature => {
        const isValid = isValidFeature(feature);
        const converted = convertFeatureToEnum(feature);
        expect(isValid).toBe(converted !== null);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      // Act & Assert
      expect(convertFeatureToEnum(null as any)).toBeNull();
      expect(convertFeatureToEnum(undefined as any)).toBeNull();
      expect(isValidFeature(null as any)).toBe(false);
      expect(isValidFeature(undefined as any)).toBe(false);
    });

    it('should handle special characters in feature names', () => {
      // Arrange
      const specialCharFeatures = [
        'mfa_enforcement!',
        'sso_integration@',
        'password_policy#',
        'mfa_enforcement$',
        'sso_integration%',
      ];

      // Act & Assert
      specialCharFeatures.forEach(feature => {
        expect(convertFeatureToEnum(feature)).toBeNull();
        expect(isValidFeature(feature)).toBe(false);
      });
    });

    it('should handle whitespace in feature names', () => {
      // Arrange
      const whitespaceFeatures = [
        ' mfa_enforcement',
        'mfa_enforcement ',
        ' mfa_enforcement ',
        '\tmfa_enforcement',
        'mfa_enforcement\n',
      ];

      // Act & Assert
      whitespaceFeatures.forEach(feature => {
        expect(convertFeatureToEnum(feature)).toBeNull();
        expect(isValidFeature(feature)).toBe(false);
      });
    });
  });

  describe('Performance', () => {
    it('should handle large number of feature checks efficiently', () => {
      // Arrange
      const features = Array.from({ length: 1000 }, (_, i) =>
        i % 2 === 0 ? 'mfa_enforcement' : 'invalid_feature'
      );

      // Act
      const startTime = Date.now();
      features.forEach(feature => {
        convertFeatureToEnum(feature);
        isValidFeature(feature);
      });
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});
