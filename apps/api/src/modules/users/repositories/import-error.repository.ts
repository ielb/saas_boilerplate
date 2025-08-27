import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ImportError } from '../entities/import-error.entity';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class ImportErrorRepository extends TenantScopedRepository<ImportError> {
  constructor(private dataSource: DataSource) {
    super(ImportError, dataSource.manager);
  }

  protected getTenantIdField(): string {
    return 'jobId'; // Import errors are scoped by job, not tenant directly
  }

  /**
   * Create import error
   */
  async createError(errorData: Partial<ImportError>): Promise<ImportError> {
    const error = this.create(errorData);
    return await this.save(error);
  }

  /**
   * Get errors for a specific job with pagination
   */
  async findErrorsByJobId(
    jobId: string,
    pagination: PaginationDto
  ): Promise<{ errors: ImportError[]; total: number }> {
    const query = this.createQueryBuilder('error')
      .where('error.jobId = :jobId', { jobId })
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
   * Get error summary for a job
   */
  async getErrorSummary(jobId: string): Promise<{
    totalErrors: number;
    errorsByField: Record<string, number>;
    errorsByType: Record<string, number>;
  }> {
    const totalErrors = await this.count({ where: { jobId } });

    // Get errors by field
    const fieldStats = await this.createQueryBuilder('error')
      .select('error.fieldName', 'fieldName')
      .addSelect('COUNT(*)', 'count')
      .where('error.jobId = :jobId', { jobId })
      .andWhere('error.fieldName IS NOT NULL')
      .groupBy('error.fieldName')
      .getRawMany();

    const errorsByField: Record<string, number> = {};
    for (const stat of fieldStats) {
      errorsByField[stat.fieldName] = parseInt(stat.count);
    }

    // Get errors by type (based on error message patterns)
    const typeStats = await this.createQueryBuilder('error')
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
   * Get most common errors for a job
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
    const commonErrors = await this.createQueryBuilder('error')
      .select('error.errorMessage', 'errorMessage')
      .addSelect('COUNT(*)', 'count')
      .where('error.jobId = :jobId', { jobId })
      .groupBy('error.errorMessage')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    const result = [];
    for (const error of commonErrors) {
      // Get example row numbers for this error
      const examples = await this.createQueryBuilder('error')
        .select('error.rowNumber', 'rowNumber')
        .where('error.jobId = :jobId', { jobId })
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
   * Delete errors for a job
   */
  async deleteErrorsByJobId(jobId: string): Promise<number> {
    const result = await this.delete({ jobId });
    return result.affected || 0;
  }

  /**
   * Get errors by field name
   */
  async findErrorsByField(
    jobId: string,
    fieldName: string
  ): Promise<ImportError[]> {
    return await this.find({
      where: { jobId, fieldName },
      order: { rowNumber: 'ASC' },
    });
  }

  /**
   * Get errors by row number range
   */
  async findErrorsByRowRange(
    jobId: string,
    startRow: number,
    endRow: number
  ): Promise<ImportError[]> {
    return await this.createQueryBuilder('error')
      .where('error.jobId = :jobId', { jobId })
      .andWhere('error.rowNumber >= :startRow', { startRow })
      .andWhere('error.rowNumber <= :endRow', { endRow })
      .orderBy('error.rowNumber', 'ASC')
      .getMany();
  }

  /**
   * Export errors to CSV format
   */
  async exportErrorsToCsv(jobId: string): Promise<string> {
    const errors = await this.find({
      where: { jobId },
      order: { rowNumber: 'ASC' },
    });

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
