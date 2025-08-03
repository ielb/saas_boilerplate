import { ValidationError, ValidationResult } from '../types/common.types';

export class ValidationUtils {
  /**
   * Validates email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates password strength
   */
  static validatePassword(password: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (password.length < 8) {
      errors.push({
        field: 'password',
        message: 'Password must be at least 8 characters long',
        value: password,
      });
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one lowercase letter',
        value: password,
      });
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one uppercase letter',
        value: password,
      });
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one number',
        value: password,
      });
    }

    if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one special character',
        value: password,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates phone number format
   */
  static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validates URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates UUID format
   */
  static isValidUuid(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validates file size
   */
  static validateFileSize(size: number, maxSize: number): ValidationResult {
    const errors: ValidationError[] = [];

    if (size > maxSize) {
      errors.push({
        field: 'file',
        message: `File size must be less than ${this.formatFileSize(maxSize)}`,
        value: size,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates file type
   */
  static validateFileType(
    mimeType: string,
    allowedTypes: string[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!allowedTypes.includes(mimeType)) {
      errors.push({
        field: 'file',
        message: `File type ${mimeType} is not allowed. Allowed types: ${allowedTypes.join(
          ', '
        )}`,
        value: mimeType,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates required fields
   */
  static validateRequired(
    data: Record<string, any>,
    requiredFields: string[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const field of requiredFields) {
      if (
        !data[field] ||
        (typeof data[field] === 'string' && data[field].trim() === '')
      ) {
        errors.push({
          field,
          message: `${field} is required`,
          value: data[field],
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates string length
   */
  static validateStringLength(
    value: string,
    minLength: number,
    maxLength: number,
    fieldName: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (value.length < minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${minLength} characters long`,
        value,
      });
    }

    if (value.length > maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be no more than ${maxLength} characters long`,
        value,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates numeric range
   */
  static validateNumericRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (value < min) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${min}`,
        value,
      });
    }

    if (value > max) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be no more than ${max}`,
        value,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates date range
   */
  static validateDateRange(
    date: Date,
    minDate: Date,
    maxDate: Date,
    fieldName: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (date < minDate) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be after ${minDate.toISOString()}`,
        value: date,
      });
    }

    if (date > maxDate) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be before ${maxDate.toISOString()}`,
        value: date,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates array length
   */
  static validateArrayLength(
    array: any[],
    minLength: number,
    maxLength: number,
    fieldName: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (array.length < minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must have at least ${minLength} items`,
        value: array.length,
      });
    }

    if (array.length > maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must have no more than ${maxLength} items`,
        value: array.length,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates object structure
   */
  static validateObjectStructure(
    obj: Record<string, any>,
    requiredKeys: string[],
    optionalKeys: string[] = []
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const allKeys = [...requiredKeys, ...optionalKeys];
    const objKeys = Object.keys(obj);

    // Check for required keys
    for (const key of requiredKeys) {
      if (!objKeys.includes(key)) {
        errors.push({
          field: key,
          message: `Required field ${key} is missing`,
          value: undefined,
        });
      }
    }

    // Check for unexpected keys
    for (const key of objKeys) {
      if (!allKeys.includes(key)) {
        errors.push({
          field: key,
          message: `Unexpected field ${key}`,
          value: obj[key],
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Formats file size for display
   */
  private static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Sanitizes input string
   */
  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/[&]/g, '&amp;') // Escape ampersands
      .replace(/["]/g, '&quot;') // Escape quotes
      .replace(/[']/g, '&#x27;'); // Escape apostrophes
  }

  /**
   * Validates and sanitizes email
   */
  static validateAndSanitizeEmail(email: string): ValidationResult {
    const sanitizedEmail = email.trim().toLowerCase();

    if (!this.isValidEmail(sanitizedEmail)) {
      return {
        isValid: false,
        errors: [
          {
            field: 'email',
            message: 'Invalid email format',
            value: email,
          },
        ],
      };
    }

    return {
      isValid: true,
      errors: [],
    };
  }
}
