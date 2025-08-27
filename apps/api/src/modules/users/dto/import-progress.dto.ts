import { ApiProperty } from '@nestjs/swagger';
import { BulkImportJobStatus } from '../entities/bulk-import-job.entity';

export class ImportProgressDto {
  @ApiProperty({ description: 'Import job ID' })
  jobId!: string;

  @ApiProperty({ description: 'Current job status', enum: BulkImportJobStatus })
  status!: BulkImportJobStatus;

  @ApiProperty({ description: 'Progress information' })
  progress!: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    percentage: number;
  };

  @ApiProperty({
    description: 'Estimated time remaining in seconds',
    required: false,
  })
  estimatedTimeRemaining?: number | undefined;

  @ApiProperty({ description: 'Job duration in milliseconds', required: false })
  duration?: number | undefined;

  @ApiProperty({ description: 'Job start time', required: false })
  startedAt?: Date | undefined;

  @ApiProperty({ description: 'Job completion time', required: false })
  completedAt?: Date | undefined;

  @ApiProperty({ description: 'Error count', required: false })
  errorCount?: number | undefined;
}

export class ImportErrorDto {
  @ApiProperty({ description: 'Error ID' })
  id!: string;

  @ApiProperty({ description: 'Row number where error occurred' })
  rowNumber!: number;

  @ApiProperty({
    description: 'Field name where error occurred',
    required: false,
  })
  fieldName?: string;

  @ApiProperty({ description: 'Error message' })
  errorMessage!: string;

  @ApiProperty({ description: 'Raw data from the row', required: false })
  rawData?: Record<string, any>;

  @ApiProperty({ description: 'Error creation time' })
  createdAt!: Date;
}
