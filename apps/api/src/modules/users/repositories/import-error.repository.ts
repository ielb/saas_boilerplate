import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ImportError } from '../entities/import-error.entity';
import { BulkImportJob } from '../entities/bulk-import-job.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { getCurrentTenantId } from '../../../common/interceptors/tenant-scoping.interceptor';

@Injectable()
export class ImportErrorRepository extends Repository<ImportError> {
  private readonly logger = new Logger(ImportErrorRepository.name);

  constructor(private dataSource: DataSource) {
    super(ImportError, dataSource.manager);
  }

  /**
   * Apply tenant scoping through job relationship
   */
  private applyTenantScope(queryBuilder: any): any {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      this.logger.warn('No tenant context available for query scoping');
      return queryBuilder;
    }

    return queryBuilder
      .leftJoin('error.job', 'job')
      .andWhere('job.tenantId = :tenantId', { tenantId });
  }

  /**
   * Create import error
   */
  async createError(errorData: Partial<ImportError>): Promise<ImportError> {
    const error = this.create(errorData);
    return await this.save(error);
  }

  /**
   * Get errors for a specific job with pagination and tenant scoping
   */
  async findErrorsByJobId(
    jobId: string,
    pagination: PaginationDto
  ): Promise<{ errors: ImportError[]; total: number }> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    const query = this.createQueryBuilder('error')
      .leftJoin('error.job', 'job')
      .where('error.jobId = :jobId', { jobId })
      .andWhere('job.tenantId = :tenantId', { tenantId })
      .orderBy('error.rowNumber', 'ASC')
      .addOrderBy('error.createdAt', 'ASC');

    const total = await query.getCount();

    const offset = ((pagination.page || 1) - 1) * (pagination.limit || 10);
    const errors = await query
      .skip(offset)
      .take(pagination.limit || 10)
      .getMany();

    return { errors, total };
  }

  /**
   * Get error summary for a job with tenant scoping
   */
  async getErrorSummary(jobId: string): Promise<{
    totalErrors: number;
    errorsByField: Record<string, number>;
    errorsByType: Record<string, number>;
  }> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    const totalErrors = await this.createQueryBuilder('error')
      .leftJoin('error.job', 'job')
      .where('error.jobId = :jobId', { jobId })
      .andWhere('job.tenantId = :tenantId', { tenantId })
      .getCount();

    // Get errors by field
    const fieldStats = await this.createQueryBuilder('error')
      .leftJoin('error.job', 'job')
      .select('error.fieldName', 'fieldName')
      .addSelect('COUNT(*)', 'count')
      .where('error.jobId = :jobId', { jobId })
      .andWhere('job.tenantId = :tenantId', { tenantId })
      .andWhere('error.fieldName IS NOT NULL')
      .groupBy('error.fieldName')
      .getRawMany();

    const errorsByField: Record<string, number> = {};
    for (const stat of fieldStats) {
      errorsByField[stat.fieldName] = parseInt(stat.count);
    }

    // Get errors by type (based on error message patterns)
    const typeStats = await this.createQueryBuilder('error')
      .leftJoin('error.job', 'job')
      .select(
        'CASE ' +
          "WHEN error.errorMessage LIKE '%email%' THEN 'email' " +
          "WHEN error.errorMessage LIKE '%name%' THEN 'name' " +
          "WHEN error.errorMessage LIKE '%role%' THEN 'role' " +
          "WHEN error.errorMessage LIKE '%phone%' THEN 'phone' " +
          "WHEN error.errorMessage LIKE '%required%' THEN 'required' " +
          "ELSE 'other' " +
          'END',
        'errorType'
      )
      .addSelect('COUNT(*)', 'count')
      .where('error.jobId = :jobId', { jobId })
      .andWhere('job.tenantId = :tenantId', { tenantId })
      .groupBy('errorType')
      .getRawMany();

    const errorsByType: Record<string, number> = {};
    for (const stat of typeStats) {
      errorsByType[stat.errorType] = parseInt(stat.count);
    }

    return {
      totalErrors,
      errorsByField,
      errorsByType,
    };
  }

  /**
   * Get most common errors for a job with tenant scoping
   */
  async getMostCommonErrors(
    jobId: string,
    limit: number = 10
  ): Promise<
    {
      errorMessage: string;
      count: number;
      examples: string[];
    }[]
  > {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    const commonErrors = await this.createQueryBuilder('error')
      .leftJoin('error.job', 'job')
      .select('error.errorMessage', 'errorMessage')
      .addSelect('COUNT(*)', 'count')
      .where('error.jobId = :jobId', { jobId })
      .andWhere('job.tenantId = :tenantId', { tenantId })
      .groupBy('error.errorMessage')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    const result = [];
    for (const error of commonErrors) {
      // Get example row numbers for this error
      const examples = await this.createQueryBuilder('error')
        .leftJoin('error.job', 'job')
        .select('error.rowNumber', 'rowNumber')
        .where('error.jobId = :jobId', { jobId })
        .andWhere('job.tenantId = :tenantId', { tenantId })
        .andWhere('error.errorMessage = :errorMessage', {
          errorMessage: error.errorMessage,
        })
        .orderBy('error.rowNumber', 'ASC')
        .limit(5)
        .getRawMany();

      result.push({
        errorMessage: error.errorMessage,
        count: parseInt(error.count),
        examples: examples.map(ex => `Row ${ex.rowNumber}`),
      });
    }

    return result;
  }

  /**
   * Delete errors for a job with tenant scoping
   */
  async deleteErrorsByJobId(jobId: string): Promise<number> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    const result = await this.createQueryBuilder('error')
      .leftJoin('error.job', 'job')
      .delete()
      .where('error.jobId = :jobId', { jobId })
      .andWhere('job.tenantId = :tenantId', { tenantId })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get errors by field name with tenant scoping
   */
  async findErrorsByField(
    jobId: string,
    fieldName: string
  ): Promise<ImportError[]> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    return await this.createQueryBuilder('error')
      .leftJoin('error.job', 'job')
      .where('error.jobId = :jobId', { jobId })
      .andWhere('job.tenantId = :tenantId', { tenantId })
      .andWhere('error.fieldName = :fieldName', { fieldName })
      .orderBy('error.rowNumber', 'ASC')
      .getMany();
  }

  /**
   * Get errors by row number range with tenant scoping
   */
  async findErrorsByRowRange(
    jobId: string,
    startRow: number,
    endRow: number
  ): Promise<ImportError[]> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    return await this.createQueryBuilder('error')
      .leftJoin('error.job', 'job')
      .where('error.jobId = :jobId', { jobId })
      .andWhere('job.tenantId = :tenantId', { tenantId })
      .andWhere('error.rowNumber >= :startRow', { startRow })
      .andWhere('error.rowNumber <= :endRow', { endRow })
      .orderBy('error.rowNumber', 'ASC')
      .getMany();
  }

  /**
   * Count errors for a job with tenant scoping
   */
  async countErrorsByJobId(jobId: string): Promise<number> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    return await this.createQueryBuilder('error')
      .leftJoin('error.job', 'job')
      .where('error.jobId = :jobId', { jobId })
      .andWhere('job.tenantId = :tenantId', { tenantId })
      .getCount();
  }

  /**
   * Export errors to CSV format with tenant scoping
   */
  async exportErrorsToCsv(jobId: string): Promise<string> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new Error('Tenant context required');
    }

    const errors = await this.createQueryBuilder('error')
      .leftJoin('error.job', 'job')
      .where('error.jobId = :jobId', { jobId })
      .andWhere('job.tenantId = :tenantId', { tenantId })
      .orderBy('error.rowNumber', 'ASC')
      .getMany();

    const csvHeaders = [
      'Row Number',
      'Field Name',
      'Error Message',
      'Raw Data',
      'Created At',
    ];
    const csvRows = errors.map(error => [
      error.rowNumber,
      error.fieldName || '',
      error.errorMessage,
      error.rawData ? JSON.stringify(error.rawData) : '',
      error.createdAt.toISOString(),
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }
}
