import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  BulkImportJob,
  BulkImportJobStatus,
} from '../entities/bulk-import-job.entity';
import { ImportError } from '../entities/import-error.entity';
import { BulkImportJobRepository } from '../repositories/bulk-import-job.repository';
import { ImportErrorRepository } from '../repositories/import-error.repository';
import { CsvParserUtil } from '../utils/csv-parser.util';
import { CsvValidatorUtil } from '../utils/csv-validator.util';
import { UserMapperUtil, MappedUserData } from '../utils/user-mapper.util';
import { UsersService } from './users.service';
import { UserRepository } from '../repositories/user.repository';
import { TeamService } from '../../teams/services/team.service';
import { BulkImportDto } from '../dto/bulk-import.dto';
import { ImportProgressDto } from '../dto/import-progress.dto';

export interface ProcessImportJobData {
  jobId: string;
  csvData: Record<string, any>[];
  options: BulkImportDto;
  tenantId: string;
  userId: string;
}

@Injectable()
export class BulkUsersImportService {
  private readonly logger = new Logger(BulkUsersImportService.name);

  constructor(
    private readonly userService: UsersService,
    private readonly userRepository: UserRepository,
    private readonly teamService: TeamService,
    private readonly bulkImportJobRepository: BulkImportJobRepository,
    private readonly importErrorRepository: ImportErrorRepository,
    private readonly csvParser: CsvParserUtil,
    private readonly csvValidator: CsvValidatorUtil,
    private readonly userMapper: UserMapperUtil
  ) {}

  /**
   * Process CSV file upload and start import job
   */
  async processImport(
    file: Express.Multer.File,
    options: BulkImportDto,
    tenantId: string,
    userId: string
  ): Promise<BulkImportJob> {
    // Validate file
    const fileValidation = this.csvValidator.validateFile(file);
    if (!fileValidation.isValid) {
      throw new BadRequestException('Invalid file', {
        cause: fileValidation.errors,
      });
    }

    // Parse CSV
    const parseOptions: any = {
      skipHeaderRow: options.validationRules?.skipHeaderRow ?? false,
    };
    if (options.validationRules?.maxRecords) {
      parseOptions.maxRows = parseInt(options.validationRules.maxRecords);
    }
    const parseResult = await this.csvParser.parse(file.buffer, parseOptions);

    if (parseResult.errors.length > 0) {
      throw new BadRequestException('CSV parsing errors', {
        cause: parseResult.errors,
      });
    }

    // Validate CSV structure using field mapping
    const requiredFields = ['email', 'firstName', 'lastName'];
    const optionalFields = ['role', 'phone', 'status', 'team'];

    const structureValidation = this.csvValidator.validateStructureWithMapping(
      parseResult.data,
      requiredFields,
      optionalFields,
      options.mapping
    );

    this.logger.log(
      `Structure validation: ${JSON.stringify(structureValidation)}`
    );

    if (!structureValidation.isValid) {
      throw new BadRequestException('Invalid CSV structure', {
        cause: structureValidation.errors,
      });
    }

    // Create import job
    const job = await this.bulkImportJobRepository.createJob({
      tenantId,
      createdBy: userId,
      fileName: file.originalname,
      fileSize: file.size,
      totalRecords: parseResult.data.length,
      options: {
        ...options,
        headers: parseResult.headers,
      },
    });

    // Start background processing
    await this.processImportJob({
      jobId: job.id,
      csvData: parseResult.data,
      options,
      tenantId,
      userId,
    });

    return job;
  }

  /**
   * Process import job in background
   */
  async processImportJob(jobData: ProcessImportJobData): Promise<void> {
    const { jobId, csvData, options, tenantId, userId } = jobData;

    try {
      this.logger.log(
        `Starting import job ${jobId} with ${csvData.length} records`
      );

      await this.bulkImportJobRepository.updateJobStatus(
        jobId,
        BulkImportJobStatus.PROCESSING
      );

      let processed = 0;
      let successful = 0;
      let failed = 0;

      // Get existing emails for duplicate checking
      const existingEmails = await this.getExistingEmails(tenantId);

      // Get validation rules
      const validationRules = this.csvValidator.getDefaultUserValidationRules();

      // Process each row
      for (const [index, row] of csvData.entries()) {
        try {
          const rowNumber = index + 1;

          // Map CSV data to user data first
          const userData = this.userMapper.mapRowToUserData(
            row,
            options.mapping || {},
            options.validationRules || {}
          );

          // Validate mapped data
          const validationResult = this.csvValidator.validateRow(
            userData,
            rowNumber,
            validationRules,
            {
              allowDuplicateEmails:
                options.validationRules?.allowDuplicateEmails ?? false,
              existingEmails,
            }
          );

          if (!validationResult.isValid) {
            await this.logImportErrors(
              jobId,
              rowNumber,
              validationResult.errors,
              row
            );
            failed++;
            continue;
          }

          // Additional validation for mapped data
          const mappedValidation = this.userMapper.validateMappedData(userData);
          if (!mappedValidation.isValid) {
            await this.logImportErrors(
              jobId,
              rowNumber,
              mappedValidation.errors,
              row
            );
            failed++;
            continue;
          }

          // Create user
          await this.userService.create(
            {
              ...userData,
              password: 'tempPassword123!', // Generate a temporary password
            },
            tenantId
          );

          // Add email to existing emails set to prevent duplicates within the same import
          existingEmails.add(userData.email.toLowerCase());

          successful++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Error processing row ${index + 1}: ${errorMessage}`
          );
          await this.logImportError(jobId, index + 1, [errorMessage], row);
          failed++;
        }

        processed++;

        // Update progress every 10 records
        if (processed % 10 === 0) {
          await this.updateJobProgress(jobId, processed, successful, failed);
        }
      }

      // Final progress update
      await this.updateJobProgress(jobId, processed, successful, failed);

      // Mark job as completed
      const finalStatus =
        failed === 0
          ? BulkImportJobStatus.COMPLETED
          : BulkImportJobStatus.COMPLETED;
      await this.bulkImportJobRepository.updateJobStatus(jobId, finalStatus);

      this.logger.log(
        `Import job ${jobId} completed: ${successful} successful, ${failed} failed`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Import job ${jobId} failed: ${errorMessage}`);
      await this.bulkImportJobRepository.updateJobStatus(
        jobId,
        BulkImportJobStatus.FAILED
      );
      throw error;
    }
  }

  /**
   * Get existing emails for duplicate checking
   */
  private async getExistingEmails(tenantId: string): Promise<Set<string>> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .select('user.email')
      .where('user.tenantId = :tenantId', { tenantId })
      .getMany();

    return new Set(users.map((user: any) => user.email.toLowerCase()));
  }

  /**
   * Log import errors
   */
  private async logImportErrors(
    jobId: string,
    rowNumber: number,
    errors: string[],
    rawData: Record<string, any>
  ): Promise<void> {
    for (const error of errors) {
      await this.importErrorRepository.createError({
        jobId,
        rowNumber,
        errorMessage: error,
        rawData,
      });
    }
  }

  /**
   * Log single import error
   */
  private async logImportError(
    jobId: string,
    rowNumber: number,
    errors: string[],
    rawData: Record<string, any>
  ): Promise<void> {
    await this.logImportErrors(jobId, rowNumber, errors, rawData);
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    processed: number,
    successful: number,
    failed: number
  ): Promise<void> {
    await this.bulkImportJobRepository.updateJobStatus(
      jobId,
      BulkImportJobStatus.PROCESSING,
      {
        processedRecords: processed,
        successfulRecords: successful,
        failedRecords: failed,
      }
    );
  }

  /**
   * Get import job progress
   */
  async getImportProgress(
    jobId: string,
    tenantId: string
  ): Promise<ImportProgressDto> {
    const job = await this.bulkImportJobRepository.findJobById(jobId, tenantId);

    if (!job) {
      throw new BadRequestException('Import job not found');
    }

    const errorCount =
      await this.importErrorRepository.countErrorsByJobId(jobId);

    const result: ImportProgressDto = {
      jobId: job.id,
      status: job.status,
      progress: {
        total: job.totalRecords,
        processed: job.processedRecords,
        successful: job.successfulRecords,
        failed: job.failedRecords,
        percentage: job.progressPercentage,
      },
    };

    // Only add optional properties if they have values
    const estimatedTimeRemaining = this.calculateEstimatedTimeRemaining(job);
    if (estimatedTimeRemaining !== undefined) {
      result.estimatedTimeRemaining = estimatedTimeRemaining;
    }

    if (job.duration !== null && job.duration !== undefined) {
      result.duration = job.duration;
    }

    if (job.startedAt !== undefined) {
      result.startedAt = job.startedAt;
    }

    if (job.completedAt !== undefined) {
      result.completedAt = job.completedAt;
    }

    if (errorCount !== undefined) {
      result.errorCount = errorCount;
    }

    return result;
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateEstimatedTimeRemaining(
    job: BulkImportJob
  ): number | undefined {
    if (!job.startedAt || job.processedRecords === 0) {
      return undefined;
    }

    const elapsed = Date.now() - job.startedAt.getTime();
    const recordsPerSecond = job.processedRecords / (elapsed / 1000);
    const remainingRecords = job.totalRecords - job.processedRecords;

    return Math.round(remainingRecords / recordsPerSecond);
  }

  /**
   * Cancel import job
   */
  async cancelImportJob(jobId: string, tenantId: string): Promise<void> {
    const job = await this.bulkImportJobRepository.findJobById(jobId, tenantId);

    if (!job) {
      throw new BadRequestException('Import job not found');
    }

    if (
      job.status !== BulkImportJobStatus.PENDING &&
      job.status !== BulkImportJobStatus.PROCESSING
    ) {
      throw new BadRequestException('Cannot cancel completed or failed job');
    }

    await this.bulkImportJobRepository.updateJobStatus(
      jobId,
      BulkImportJobStatus.FAILED
    );
  }

  /**
   * Retry failed import job
   */
  async retryImportJob(
    jobId: string,
    tenantId: string
  ): Promise<BulkImportJob> {
    const job = await this.bulkImportJobRepository.findJobById(jobId, tenantId);

    if (!job) {
      throw new BadRequestException('Import job not found');
    }

    if (job.status !== BulkImportJobStatus.FAILED) {
      throw new BadRequestException('Can only retry failed jobs');
    }

    // Clear previous errors
    await this.importErrorRepository.deleteErrorsByJobId(jobId);

    // Reset job status
    await this.bulkImportJobRepository.updateJobStatus(
      jobId,
      BulkImportJobStatus.PENDING,
      {
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
      }
    );

    // Restart processing (this would typically be queued)
    // For now, we'll just reset the status
    return job;
  }
}
