import { Injectable } from '@nestjs/common';
import { UserRole, UserStatus } from '@app/shared';
import { FieldMappingDto, ValidationRulesDto } from '../dto/bulk-import.dto';

export interface MappedUserData {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  phone?: string;
  status?: string;
  teamId?: string;
  password?: string;
  isEmailVerified?: boolean;
}

@Injectable()
export class UserMapperUtil {
  /**
   * Map CSV row to user data using field mapping
   */
  mapRowToUserData(
    row: Record<string, any>,
    mapping: FieldMappingDto,
    validationRules: ValidationRulesDto
  ): MappedUserData {
    const mappedData: MappedUserData = {
      email: this.getMappedValue(row, mapping.email, 'email'),
      firstName: this.getMappedValue(row, mapping.firstName, 'firstName'),
      lastName: this.getMappedValue(row, mapping.lastName, 'lastName'),
    };

    // Map optional fields
    if (mapping.role) {
      const roleValue = this.getMappedValue(row, mapping.role, 'role');
      if (roleValue) {
        mappedData.role = this.normalizeRole(roleValue);
      }
    }

    if (mapping.phone) {
      const phoneValue = this.getMappedValue(row, mapping.phone, 'phone');
      if (phoneValue) {
        mappedData.phone = this.normalizePhone(phoneValue);
      }
    }

    if (mapping.status) {
      const statusValue = this.getMappedValue(row, mapping.status, 'status');
      if (statusValue) {
        mappedData.status = this.normalizeStatus(statusValue);
      }
    }

    // Apply default values from validation rules
    if (validationRules.defaultRole && !mappedData.role) {
      mappedData.role = this.normalizeRole(validationRules.defaultRole);
    }

    if (!mappedData.status) {
      mappedData.status = 'active';
    }

    // Set default values
    mappedData.isEmailVerified = false;

    return mappedData;
  }

  /**
   * Get mapped value from row using field mapping
   */
  private getMappedValue(
    row: Record<string, any>,
    mappedField: string | undefined,
    defaultField: string
  ): string {
    if (mappedField && row[mappedField] !== undefined) {
      return String(row[mappedField]).trim();
    }

    // Fallback to default field name
    return row[defaultField] ? String(row[defaultField]).trim() : '';
  }

  /**
   * Normalize role value
   */
  private normalizeRole(role: string): UserRole {
    const normalizedRole = role.toLowerCase().trim();

    // Map common role variations
    const roleMap: Record<string, UserRole> = {
      admin: UserRole.ADMIN,
      administrator: UserRole.ADMIN,
      'super admin': UserRole.ADMIN,
      superadmin: UserRole.ADMIN,
      owner: UserRole.OWNER,
      'co-owner': UserRole.MANAGER, // Map to manager as closest equivalent
      co_owner: UserRole.MANAGER,
      coowner: UserRole.MANAGER,
      manager: UserRole.MANAGER,
      user: UserRole.MEMBER,
      member: UserRole.MEMBER,
      employee: UserRole.MEMBER,
      staff: UserRole.MEMBER,
      guest: UserRole.VIEWER,
      viewer: UserRole.VIEWER,
      readonly: UserRole.VIEWER,
      'read-only': UserRole.VIEWER,
    };

    return roleMap[normalizedRole] || UserRole.MEMBER;
  }

  /**
   * Normalize phone number
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // Format as international number if it starts with country code
    if (digitsOnly.length >= 10) {
      // Basic formatting - in production, you might want to use a library like libphonenumber-js
      return `+${digitsOnly}`;
    }

    return phone.trim();
  }

  /**
   * Normalize status value
   */
  private normalizeStatus(status: string): string {
    const normalizedStatus = status.toLowerCase().trim();

    // Check if it's a valid UserStatus
    if (Object.values(UserStatus).includes(normalizedStatus as UserStatus)) {
      return normalizedStatus;
    }

    // Map common status variations to valid UserStatus values
    const statusMap: Record<string, string> = {
      enabled: UserStatus.ACTIVE,
      disabled: UserStatus.SUSPENDED,
      inactive: UserStatus.SUSPENDED, // Map 'inactive' to 'suspended'
      waiting: UserStatus.PENDING,
      blocked: UserStatus.SUSPENDED,
      deactivated: UserStatus.SUSPENDED,
    };

    return statusMap[normalizedStatus] || UserStatus.ACTIVE;
  }

  /**
   * Generate CSV template with headers
   */
  generateCsvTemplate(mapping: FieldMappingDto): string {
    const headers: string[] = [];

    // Add mapped fields
    if (mapping.email) headers.push(mapping.email);
    if (mapping.firstName) headers.push(mapping.firstName);
    if (mapping.lastName) headers.push(mapping.lastName);
    if (mapping.role) headers.push(mapping.role);
    if (mapping.phone) headers.push(mapping.phone);
    if (mapping.status) headers.push(mapping.status);
    if (mapping.team) headers.push(mapping.team);

    // Add default fields if not mapped
    if (!mapping.email) headers.push('email');
    if (!mapping.firstName) headers.push('firstName');
    if (!mapping.lastName) headers.push('lastName');
    if (!mapping.role) headers.push('role');
    if (!mapping.phone) headers.push('phone');
    if (!mapping.status) headers.push('status');
    if (!mapping.team) headers.push('team');

    return headers.join(',') + '\n';
  }

  /**
   * Get field mapping suggestions based on CSV headers
   */
  suggestFieldMapping(headers: string[]): FieldMappingDto {
    const mapping: FieldMappingDto = {};

    const headerMap = new Map(headers.map(h => [h.toLowerCase(), h]));

    // Email field mapping
    const emailVariations = [
      'email',
      'e-mail',
      'email address',
      'user email',
      'mail',
    ];
    for (const variation of emailVariations) {
      if (headerMap.has(variation)) {
        const emailValue = headerMap.get(variation);
        if (emailValue) {
          mapping.email = emailValue;
        }
        break;
      }
    }

    // First name field mapping
    const firstNameVariations = [
      'first name',
      'firstname',
      'first_name',
      'given name',
      'name',
      'fname',
    ];
    for (const variation of firstNameVariations) {
      if (headerMap.has(variation)) {
        const firstNameValue = headerMap.get(variation);
        if (firstNameValue) {
          mapping.firstName = firstNameValue;
        }
        break;
      }
    }

    // Last name field mapping
    const lastNameVariations = [
      'last name',
      'lastname',
      'last_name',
      'surname',
      'family name',
      'lname',
    ];
    for (const variation of lastNameVariations) {
      if (headerMap.has(variation)) {
        const lastNameValue = headerMap.get(variation);
        if (lastNameValue) {
          mapping.lastName = lastNameValue;
        }
        break;
      }
    }

    // Role field mapping
    const roleVariations = [
      'role',
      'user role',
      'position',
      'job title',
      'title',
    ];
    for (const variation of roleVariations) {
      if (headerMap.has(variation)) {
        const roleValue = headerMap.get(variation);
        if (roleValue) {
          mapping.role = roleValue;
        }
        break;
      }
    }

    // Phone field mapping
    const phoneVariations = [
      'phone',
      'phone number',
      'telephone',
      'mobile',
      'cell',
      'contact',
    ];
    for (const variation of phoneVariations) {
      if (headerMap.has(variation)) {
        const phoneValue = headerMap.get(variation);
        if (phoneValue) {
          mapping.phone = phoneValue;
        }
        break;
      }
    }

    // Status field mapping
    const statusVariations = ['status', 'user status', 'active', 'enabled'];
    for (const variation of statusVariations) {
      if (headerMap.has(variation)) {
        const statusValue = headerMap.get(variation);
        if (statusValue) {
          mapping.status = statusValue;
        }
        break;
      }
    }

    // Team field mapping
    const teamVariations = ['team', 'department', 'group', 'organization'];
    for (const variation of teamVariations) {
      if (headerMap.has(variation)) {
        const teamValue = headerMap.get(variation);
        if (teamValue) {
          mapping.team = teamValue;
        }
        break;
      }
    }

    return mapping;
  }

  /**
   * Validate mapped data
   */
  validateMappedData(data: MappedUserData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Email format is invalid');
    }

    if (!data.firstName) {
      errors.push('First name is required');
    } else if (data.firstName.length < 2) {
      errors.push('First name must be at least 2 characters');
    }

    if (!data.lastName) {
      errors.push('Last name is required');
    } else if (data.lastName.length < 2) {
      errors.push('Last name must be at least 2 characters');
    }

    if (data.role && !Object.values(UserRole).includes(data.role)) {
      errors.push('Invalid role value');
    }

    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Phone number format is invalid');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  }
}
