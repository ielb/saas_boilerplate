import { Injectable } from '@nestjs/common';
import { UserRole, UserStatus } from '@app/shared';
import { FieldMappingDto } from '../dto/bulk-import.dto';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'email' | 'string' | 'phone' | 'role' | 'status';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: string[];
  customValidator?: (value: any) => boolean | string;
}

@Injectable()
export class CsvValidatorUtil {
  /**
   * Validate CSV structure and required fields
   */
  validateStructure(
    data: Record<string, any>[],
    requiredFields: string[],
    optionalFields: string[] = []
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (data.length === 0) {
      errors.push('CSV file is empty');
      return { isValid: false, errors, warnings };
    }

    const sampleRow = data[0];
    if (!sampleRow) {
      errors.push('CSV file is empty');
      return { isValid: false, errors, warnings };
    }
    const availableFields = Object.keys(sampleRow);
    // Check required fields
    for (const field of requiredFields) {
      if (!availableFields.includes(field)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check for unknown fields
    const allExpectedFields = [...requiredFields, ...optionalFields];
    for (const field of availableFields) {
      if (!allExpectedFields.includes(field)) {
        warnings.push(`Unknown field: ${field}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate CSV structure using field mapping
   */
  validateStructureWithMapping(
    data: Record<string, any>[],
    requiredFields: string[],
    optionalFields: string[] = [],
    mapping?: FieldMappingDto
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (data.length === 0) {
      errors.push('CSV file is empty');
      return { isValid: false, errors, warnings };
    }

    const sampleRow = data[0];
    if (!sampleRow) {
      errors.push('CSV file is empty');
      return { isValid: false, errors, warnings };
    }

    const availableFields = Object.keys(sampleRow);

    // If mapping is provided, check if mapped fields exist
    if (mapping) {
      // Check required fields using mapping
      for (const field of requiredFields) {
        let mappedField: string | undefined;

        // Access mapping properties directly
        switch (field) {
          case 'email':
            mappedField = mapping.email;
            break;
          case 'firstName':
            mappedField = mapping.firstName;
            break;
          case 'lastName':
            mappedField = mapping.lastName;
            break;
          case 'role':
            mappedField = mapping.role;
            break;
          case 'phone':
            mappedField = mapping.phone;
            break;
          case 'status':
            mappedField = mapping.status;
            break;
          case 'team':
            mappedField = mapping.team;
            break;
          default:
            mappedField = undefined;
        }

        if (mappedField && !availableFields.includes(mappedField)) {
          errors.push(
            `Missing required field: ${field} (mapped to: ${mappedField})`
          );
        } else if (!mappedField && !availableFields.includes(field)) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      // Check for unknown fields (fields not in mapping)
      const mappedFields = [
        mapping.email,
        mapping.firstName,
        mapping.lastName,
        mapping.role,
        mapping.phone,
        mapping.status,
        mapping.team,
      ].filter(Boolean) as string[];

      for (const field of availableFields) {
        if (!mappedFields.includes(field) && !optionalFields.includes(field)) {
          warnings.push(`Unknown field: ${field}`);
        }
      }
    } else {
      // Fallback to original validation
      for (const field of requiredFields) {
        if (!availableFields.includes(field)) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      const allExpectedFields = [...requiredFields, ...optionalFields];
      for (const field of availableFields) {
        if (!allExpectedFields.includes(field)) {
          warnings.push(`Unknown field: ${field}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate individual row data
   */
  validateRow(
    row: Record<string, any>,
    rowNumber: number,
    rules: ValidationRule[],
    options: {
      allowDuplicateEmails?: boolean;
      existingEmails?: Set<string>;
    } = {}
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      const value = row[rule.field];

      // Check if required field is present
      if (
        rule.required &&
        (value === null || value === undefined || value === '')
      ) {
        errors.push(`Row ${rowNumber}: ${rule.field} is required`);
        continue;
      }

      // Skip validation for empty optional fields
      if (
        !rule.required &&
        (value === null || value === undefined || value === '')
      ) {
        continue;
      }

      // Type-specific validation
      if (rule.type) {
        const typeValidation = this.validateByType(value, rule, rowNumber);
        errors.push(...typeValidation.errors);
        if (typeValidation.warnings) {
          warnings.push(...typeValidation.warnings);
        }
      }

      // Length validation
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(
            `Row ${rowNumber}: ${rule.field} must be at least ${rule.minLength} characters`
          );
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(
            `Row ${rowNumber}: ${rule.field} must be no more than ${rule.maxLength} characters`
          );
        }
      }

      // Pattern validation
      if (
        rule.pattern &&
        typeof value === 'string' &&
        !rule.pattern.test(value)
      ) {
        errors.push(`Row ${rowNumber}: ${rule.field} format is invalid`);
      }

      // Allowed values validation
      if (rule.allowedValues && !rule.allowedValues.includes(value)) {
        errors.push(
          `Row ${rowNumber}: ${rule.field} must be one of: ${rule.allowedValues.join(', ')}`
        );
      }

      // Custom validation
      if (rule.customValidator) {
        const customResult = rule.customValidator(value);
        if (typeof customResult === 'string') {
          errors.push(`Row ${rowNumber}: ${rule.field} - ${customResult}`);
        } else if (!customResult) {
          errors.push(`Row ${rowNumber}: ${rule.field} validation failed`);
        }
      }

      // Email uniqueness check
      if (
        rule.field === 'email' &&
        value &&
        !options.allowDuplicateEmails &&
        options.existingEmails
      ) {
        if (options.existingEmails.has(value.toLowerCase())) {
          errors.push(`Row ${rowNumber}: Email ${value} already exists`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate value by type
   */
  private validateByType(
    value: any,
    rule: ValidationRule,
    rowNumber: number
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (rule.type) {
      case 'email':
        if (!this.isValidEmail(value)) {
          errors.push(
            `Row ${rowNumber}: ${rule.field} is not a valid email address`
          );
        }
        break;

      case 'phone':
        if (!this.isValidPhone(value)) {
          errors.push(
            `Row ${rowNumber}: ${rule.field} is not a valid phone number`
          );
        }
        break;

      case 'role':
        if (!this.isValidRole(value)) {
          errors.push(`Row ${rowNumber}: ${rule.field} is not a valid role`);
        }
        break;

      case 'status':
        if (!this.isValidStatus(value)) {
          errors.push(`Row ${rowNumber}: ${rule.field} is not a valid status`);
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Row ${rowNumber}: ${rule.field} must be a string`);
        }
        break;
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    if (typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate phone number format
   */
  private isValidPhone(phone: string): boolean {
    if (typeof phone !== 'string') return false;

    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // Check if it's a valid phone number (7-15 digits)
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  }

  /**
   * Validate user role
   */
  private isValidRole(role: string): boolean {
    if (typeof role !== 'string') return false;

    return Object.values(UserRole).includes(role as UserRole);
  }

  /**
   * Validate user status
   */
  private isValidStatus(status: string): boolean {
    if (typeof status !== 'string') return false;

    return Object.values(UserStatus).includes(
      status.toLowerCase() as UserStatus
    );
  }

  /**
   * Get default validation rules for user import
   */
  getDefaultUserValidationRules(): ValidationRule[] {
    return [
      {
        field: 'email',
        required: true,
        type: 'email',
        maxLength: 255,
      },
      {
        field: 'firstName',
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 50,
      },
      {
        field: 'lastName',
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 50,
      },
      {
        field: 'role',
        required: false,
        type: 'role',
        allowedValues: Object.values(UserRole),
      },
      {
        field: 'phone',
        required: false,
        type: 'phone',
      },
      {
        field: 'status',
        required: false,
        type: 'status',
        allowedValues: Object.values(UserStatus),
      },
    ];
  }

  /**
   * Validate CSV file size and format
   */
  validateFile(
    file: Express.Multer.File,
    maxSize: number = 10 * 1024 * 1024
  ): ValidationResult {
    const errors: string[] = [];

    // Check file size (default 10MB)
    if (file.size > maxSize) {
      errors.push(
        `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
      );
    }

    // Check file type
    const allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push('File must be a CSV file');
    }

    // Check file extension
    const fileName = file.originalname.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      errors.push('File must have .csv extension');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
