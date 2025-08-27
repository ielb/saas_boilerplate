import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { BulkUsersImportService } from './bulk-users-import.service';
import { BulkUsersExportService } from './bulk-users-export.service';
import { BulkImportJobRepository } from '../repositories/bulk-import-job.repository';
import { ImportErrorRepository } from '../repositories/import-error.repository';
import { BulkImportDto } from '../dto/bulk-import.dto';
import { BulkExportDto } from '../dto/bulk-export.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ImportProgressDto, ImportErrorDto } from '../dto/import-progress.dto';

@Injectable()
export class BulkOperationsService {
  private readonly logger = new Logger(BulkOperationsService.name);

  constructor(
    private readonly bulkUsersImportService: BulkUsersImportService,
    private readonly bulkUsersExportService: BulkUsersExportService,
    private readonly bulkImportJobRepository: BulkImportJobRepository,
    private readonly importErrorRepository: ImportErrorRepository
  ) {}

  /**
   * Start bulk import process
   */
  async startBulkImport(
    file: Express.Multer.File,
    options: BulkImportDto,
    tenantId: string,
    userId: string
  ) {
    this.logger.log(
      `Starting bulk import for tenant ${tenantId} with file ${file.originalname}`
    );

    return await this.bulkUsersImportService.processImport(
      file,
      options,
      tenantId,
      userId
    );
  }

  /**
   * Get import progress
   */
  async getImportProgress(
    jobId: string,
    tenantId: string
  ): Promise<ImportProgressDto> {
    const progress = await this.bulkUsersImportService.getImportProgress(
      jobId,
      tenantId
    );

    return {
      jobId: progress.jobId,
      status: progress.status,
      progress: progress.progress,
      estimatedTimeRemaining: progress.estimatedTimeRemaining,
      duration: progress.duration,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt,
      errorCount: progress.errorCount,
    };
  }

  /**
   * Get import errors with pagination
   */
  async getImportErrors(
    jobId: string,
    pagination: PaginationDto,
    tenantId: string
  ): Promise<{ errors: ImportErrorDto[]; total: number; pagination: any }> {
    // Verify job belongs to tenant
    const job = await this.bulkImportJobRepository.findJobById(jobId, tenantId);
    if (!job) {
      throw new BadRequestException('Import job not found');
    }

    const result = await this.importErrorRepository.findErrorsByJobId(
      jobId,
      pagination
    );

    const errors: ImportErrorDto[] = result.errors.map(error => ({
      id: error.id,
      rowNumber: error.rowNumber,
      fieldName: error.fieldName,
      errorMessage: error.errorMessage,
      rawData: error.rawData,
      createdAt: error.createdAt,
    }));

    return {
      errors,
      total: result.total,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: result.total,
        pages: Math.ceil(result.total / (pagination.limit || 10)),
      },
    };
  }

  /**
   * Get import error summary
   */
  async getImportErrorSummary(jobId: string, tenantId: string) {
    // Verify job belongs to tenant
    const job = await this.bulkImportJobRepository.findJobById(jobId, tenantId);
    if (!job) {
      throw new BadRequestException('Import job not found');
    }

    const summary = await this.importErrorRepository.getErrorSummary(jobId);
    const commonErrors =
      await this.importErrorRepository.getMostCommonErrors(jobId);

    return {
      ...summary,
      commonErrors,
    };
  }

  /**
   * Export import errors to CSV
   */
  async exportImportErrors(
    jobId: string,
    tenantId: string
  ): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    // Verify job belongs to tenant
    const job = await this.bulkImportJobRepository.findJobById(jobId, tenantId);
    if (!job) {
      throw new BadRequestException('Import job not found');
    }

    const csvContent =
      await this.importErrorRepository.exportErrorsToCsv(jobId);
    const buffer = Buffer.from(csvContent, 'utf-8');

    return {
      buffer,
      filename: `import-errors-${jobId}-${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv',
    };
  }

  /**
   * Start bulk export process
   */
  async startBulkExport(filters: BulkExportDto, tenantId: string) {
    this.logger.log(`Starting bulk export for tenant ${tenantId}`);

    return await this.bulkUsersExportService.exportUsers(filters, tenantId);
  }

  /**
   * Generate import template
   */
  async generateImportTemplate(
    fields: string[] = ['email', 'firstName', 'lastName', 'role', 'status']
  ) {
    return await this.bulkUsersExportService.generateImportTemplate(fields);
  }

  /**
   * Get export statistics
   */
  async getExportStatistics(filters: BulkExportDto, tenantId: string) {
    return await this.bulkUsersExportService.getExportStatistics(
      filters,
      tenantId
    );
  }

  /**
   * Cancel import job
   */
  async cancelImportJob(jobId: string, tenantId: string): Promise<void> {
    await this.bulkUsersImportService.cancelImportJob(jobId, tenantId);
  }

  /**
   * Retry failed import job
   */
  async retryImportJob(jobId: string, tenantId: string) {
    return await this.bulkUsersImportService.retryImportJob(jobId, tenantId);
  }

  /**
   * Get recent import jobs
   */
  async getRecentImportJobs(tenantId: string, limit: number = 10) {
    return await this.bulkImportJobRepository.findRecentJobs(tenantId, limit);
  }

  /**
   * Get import job statistics
   */
  async getImportJobStatistics(tenantId: string) {
    return await this.bulkImportJobRepository.getJobStatistics(tenantId);
  }

  /**
   * Clean up old import jobs
   */
  async cleanupOldImportJobs(
    tenantId: string,
    daysOld: number = 30
  ): Promise<number> {
    return await this.bulkImportJobRepository.cleanupOldJobs(tenantId, daysOld);
  }

  /**
   * Reset stuck import jobs
   */
  async resetStuckImportJobs(
    tenantId: string,
    timeoutMinutes: number = 30
  ): Promise<number> {
    return await this.bulkImportJobRepository.resetStuckJobs(
      tenantId,
      timeoutMinutes
    );
  }

  /**
   * Get bulk operations dashboard data
   */
  async getDashboardData(tenantId: string) {
    const [jobStats, recentJobs, stuckJobsCount] = await Promise.all([
      this.bulkImportJobRepository.getJobStatistics(tenantId),
      this.bulkImportJobRepository.findRecentJobs(tenantId, 5),
      this.bulkImportJobRepository
        .findStuckJobs(tenantId, 30)
        .then(jobs => jobs.length),
    ]);

    return {
      jobStatistics: jobStats,
      recentJobs: recentJobs.map(job => ({
        id: job.id,
        fileName: job.fileName,
        status: job.status,
        totalRecords: job.totalRecords,
        successfulRecords: job.successfulRecords,
        failedRecords: job.failedRecords,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        duration: job.duration,
      })),
      stuckJobsCount,
      lastCleanup: new Date(), // This would be tracked in a separate table in production
    };
  }

  /**
   * Validate import file before processing
   */
  async validateImportFile(
    file: Express.Multer.File,
    options: BulkImportDto
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    statistics: any;
    suggestedMapping: any;
  }> {
    const { CsvValidatorUtil } = await import('../utils/csv-validator.util');
    const { CsvParserUtil } = await import('../utils/csv-parser.util');
    const { UserMapperUtil } = await import('../utils/user-mapper.util');

    const csvValidator = new CsvValidatorUtil();
    const csvParser = new CsvParserUtil();
    const userMapper = new UserMapperUtil();

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate file
    const fileValidation = csvValidator.validateFile(file);
    if (!fileValidation.isValid) {
      errors.push(...fileValidation.errors);
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
        statistics: null,
        suggestedMapping: null,
      };
    }

    try {
      // Parse CSV
      const parseResult = await csvParser.parse(file.buffer, {
        skipHeaderRow: options.validationRules?.skipHeaderRow ?? true,
        maxRows: 100, // Only parse first 100 rows for validation
      });

      if (parseResult.errors.length > 0) {
        errors.push(...parseResult.errors);
      }

      // Validate structure
      const requiredFields = ['email', 'firstName', 'lastName'];
      const optionalFields = ['role', 'phone', 'status', 'team'];

      const structureValidation = csvValidator.validateStructure(
        parseResult.data,
        requiredFields,
        optionalFields
      );

      if (!structureValidation.isValid) {
        errors.push(...structureValidation.errors);
      }

      if (structureValidation.warnings) {
        warnings.push(...structureValidation.warnings);
      }

      // Get statistics
      const statistics = csvParser.getStatistics(parseResult.data);

      // Get suggested mapping
      const suggestedMapping = userMapper.suggestFieldMapping(
        parseResult.headers
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        statistics,
        suggestedMapping,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(`File parsing error: ${errorMessage}`);
      return {
        isValid: false,
        errors,
        warnings,
        statistics: null,
        suggestedMapping: null,
      };
    }
  }
}
