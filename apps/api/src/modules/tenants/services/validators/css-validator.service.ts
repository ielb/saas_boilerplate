import { Injectable } from '@nestjs/common';
import { ICssValidator } from './branding-validator.interface';

@Injectable()
export class CssValidatorService implements ICssValidator {
  validateCustomCss(css: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!css) {
      return { isValid: true, errors, warnings };
    }

    // Check CSS length
    if (css.length > 10000) {
      errors.push('Custom CSS must be less than 10,000 characters');
    }

    // Check for dangerous content
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /expression\s*\(/gi,
      /url\s*\(\s*['"]?data:/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(css)) {
        errors.push('Custom CSS contains potentially dangerous content');
        break;
      }
    }

    // Check for unclosed braces
    const unclosedBraces =
      (css.match(/\{/g) || []).length - (css.match(/\}/g) || []).length;
    if (unclosedBraces !== 0) {
      warnings.push('Custom CSS may have unclosed braces');
    }

    // Check for invalid CSS properties
    const invalidProperties = [
      /position:\s*fixed/gi,
      /position:\s*absolute/gi,
      /z-index:\s*-?\d+/gi,
    ];

    for (const pattern of invalidProperties) {
      if (pattern.test(css)) {
        warnings.push(
          'Custom CSS contains potentially problematic positioning properties'
        );
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
