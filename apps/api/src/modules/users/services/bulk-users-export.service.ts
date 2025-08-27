import { Injectable, Logger } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { UserRepository } from '../repositories/user.repository';
import { BulkExportDto, ExportFormat } from '../dto/bulk-export.dto';

import * as ExcelJS from 'exceljs';
import { UserStatus } from '@app/shared';

@Injectable()
export class BulkUsersExportService {
  private readonly logger = new Logger(BulkUsersExportService.name);

  constructor(
    private readonly userService: UsersService,
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Export users to CSV or Excel format
   */
  async exportUsers(
    filters: BulkExportDto,
    tenantId: string
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    this.logger.log(`Starting user export for tenant ${tenantId}`);

    // Get users using query builder to avoid MongoDB syntax issues
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Apply tenant scope
    queryBuilder.where('user.tenantId = :tenantId', {
      tenantId: tenantId,
    });

    // Apply filters
    if (filters.role) {
      queryBuilder.andWhere('user.role = :role', { role: filters.role });
    }
    if (filters.status) {
      queryBuilder.andWhere('user.status = :status', {
        status: filters.status,
      });
    }
    if (filters.team) {
      queryBuilder.andWhere('user.team = :team', { team: filters.team });
    }
    if (filters.createdAfter) {
      queryBuilder.andWhere('user.createdAt >= :createdAfter', {
        createdAfter: new Date(filters.createdAfter),
      });
    }
    if (filters.createdBefore) {
      queryBuilder.andWhere('user.createdAt <= :createdBefore', {
        createdBefore: new Date(filters.createdBefore),
      });
    }
    if (!filters.includeInactive) {
      queryBuilder.andWhere('user.status = :status', {
        status: UserStatus.ACTIVE,
      });
    }

    const users = await queryBuilder.getMany();

    this.logger.log(`Found ${users.length} users to export`);

    // Transform data for export
    const exportData = users.map((user: any) =>
      this.transformUserForExport(user, filters.fields || [])
    );

    // Generate file based on format
    if (filters.format === ExportFormat.XLSX) {
      return await this.generateExcelFile(exportData, filters.fields || []);
    } else {
      return await this.generateCsvFile(exportData, filters.fields || []);
    }
  }

  /**
   * Transform user data for export
   */
  private transformUserForExport(
    user: User,
    fields: string[]
  ): Record<string, any> {
    // Ensure fields is always an array
    const fieldsArray = Array.isArray(fields) ? fields : [];

    const transformed: Record<string, any> = {};

    for (const field of fieldsArray) {
      switch (field) {
        case 'id':
          transformed.id = user.id;
          break;
        case 'email':
          transformed.email = user.email;
          break;
        case 'firstName':
          transformed.firstName = user.firstName;
          break;
        case 'lastName':
          transformed.lastName = user.lastName;
          break;
        case 'fullName':
          transformed.fullName = `${user.firstName} ${user.lastName}`;
          break;
        case 'role':
          transformed.role = user.role;
          break;
        case 'status':
          transformed.status = user.status;
          break;
        case 'phone':
          transformed.phone = ''; // User entity doesn't have phone field
          break;
        case 'team':
          transformed.team = ''; // User entity doesn't have team field
          break;
        case 'teamId':
          transformed.teamId = ''; // User entity doesn't have team field
          break;
        case 'isEmailVerified':
          transformed.isEmailVerified = user.emailVerified;
          break;
        case 'lastLoginAt':
          transformed.lastLoginAt = user.lastLoginAt?.toISOString() || '';
          break;
        case 'createdAt':
          transformed.createdAt = user.createdAt.toISOString();
          break;
        case 'updatedAt':
          transformed.updatedAt = user.updatedAt.toISOString();
          break;
        case 'createdBy':
          transformed.createdBy = ''; // User entity doesn't have createdBy field
          break;
        default:
          // Handle custom fields or unknown fields
          transformed[field] = (user as any)[field] || '';
      }
    }

    return transformed;
  }

  /**
   * Generate CSV file
   */
  private async generateCsvFile(
    data: Record<string, any>[],
    fields: string[]
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    // Ensure fields is always an array
    const fieldsArray = Array.isArray(fields) ? fields : [];

    if (data.length === 0) {
      // Return empty CSV with headers
      const headers = fieldsArray.join(',');
      const buffer = Buffer.from(headers + '\n', 'utf-8');
      return {
        buffer,
        filename: `users-export-${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv',
      };
    }

    // Create CSV content manually
    const headers = fieldsArray.map(field => this.formatFieldTitle(field));
    const rows = [headers.join(',')];

    for (const row of data) {
      const values = fieldsArray.map(field => {
        const value = row[field];
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const stringValue = String(value || '');
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      rows.push(values.join(','));
    }

    const csvContent = rows.join('\n');

    return {
      buffer: Buffer.from(csvContent, 'utf-8'),
      filename: `users-export-${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv',
    };
  }

  /**
   * Generate Excel file
   */
  private async generateExcelFile(
    data: Record<string, any>[],
    fields: string[]
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    // Ensure fields is always an array
    const fieldsArray = Array.isArray(fields) ? fields : [];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    // Add headers
    const headers = fieldsArray.map(field => this.formatFieldTitle(field));
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    for (const row of data) {
      const values = fieldsArray.map(field => row[field] || '');
      worksheet.addRow(values);
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(
        column.header?.length || 10,
        ...(column.values?.slice(1).map(v => String(v).length) || [10]),
        15
      );
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      filename: `users-export-${new Date().toISOString().split('T')[0]}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * Format field title for display
   */
  private formatFieldTitle(field: string): string {
    const titleMap: Record<string, string> = {
      id: 'ID',
      email: 'Email',
      firstName: 'First Name',
      lastName: 'Last Name',
      fullName: 'Full Name',
      role: 'Role',
      status: 'Status',
      phone: 'Phone',
      team: 'Team',
      teamId: 'Team ID',
      isEmailVerified: 'Email Verified',
      lastLoginAt: 'Last Login',
      createdAt: 'Created At',
      updatedAt: 'Updated At',
      createdBy: 'Created By',
    };

    return titleMap[field] || field.charAt(0).toUpperCase() + field.slice(1);
  }

  /**
   * Generate CSV template for import
   */
  async generateImportTemplate(
    fields: string[] = ['email', 'firstName', 'lastName', 'role', 'status']
  ): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    // Ensure fields is always an array
    const fieldsArray = Array.isArray(fields)
      ? fields
      : ['email', 'firstName', 'lastName', 'role', 'status'];
    // Create CSV content manually
    const headers = fieldsArray.map(field => this.formatFieldTitle(field));
    const exampleRow = fieldsArray.map(field => {
      switch (field) {
        case 'email':
          return 'john.doe@example.com';
        case 'firstName':
          return 'John';
        case 'lastName':
          return 'Doe';
        case 'role':
          return 'member';
        case 'status':
          return 'active';
        case 'phone':
          return '+1234567890';
        case 'team':
          return 'Engineering';
        default:
          return 'example_value';
      }
    });

    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');

    return {
      buffer: Buffer.from(csvContent, 'utf-8'),
      filename: `users-import-template-${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv',
    };
  }

  /**
   * Get export statistics
   */
  async getExportStatistics(
    filters: BulkExportDto,
    tenantId: string
  ): Promise<{
    totalUsers: number;
    filteredUsers: number;
    exportSize: number;
    estimatedTime: number;
  }> {
    // Get total users
    const totalUsers = await this.userRepository.countWithTenantScope();

    // Get filtered users count using query builder
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Apply tenant scope
    queryBuilder.where('user.tenantId = :tenantId', {
      tenantId: tenantId,
    });

    // Apply filters
    if (filters.role) {
      queryBuilder.andWhere('user.role = :role', { role: filters.role });
    }
    if (filters.status) {
      queryBuilder.andWhere('user.status = :status', {
        status: filters.status,
      });
    }
    if (filters.team) {
      queryBuilder.andWhere('user.team = :team', { team: filters.team });
    }
    if (filters.createdAfter) {
      queryBuilder.andWhere('user.createdAt >= :createdAfter', {
        createdAfter: new Date(filters.createdAfter),
      });
    }
    if (filters.createdBefore) {
      queryBuilder.andWhere('user.createdAt <= :createdBefore', {
        createdBefore: new Date(filters.createdBefore),
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('user.status = :status', {
        status: filters.status,

      });
    }

    const filteredUsers = await queryBuilder.getCount();

    // Estimate export size (rough calculation)
    const fields = filters.fields || [
      'email',
      'firstName',
      'lastName',
      'role',
      'status',
    ];
    const avgRowSize = fields.length * 20; // Average 20 chars per field
    const exportSize = filteredUsers * avgRowSize;

    // Estimate time (rough calculation)
    const estimatedTime = Math.max(1, Math.ceil(filteredUsers / 1000)); // 1 second per 1000 users

    return {
      totalUsers,
      filteredUsers,
      exportSize,
      estimatedTime,
    };
  }
}
