import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../../common/decorators/auth.decorator';
import { BulkOperationsService } from '../services/bulk-operations.service';
import { BulkImportDto } from '../dto/bulk-import.dto';
import { BulkExportDto } from '../dto/bulk-export.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ImportProgressDto } from '../dto/import-progress.dto';

@ApiTags('Bulk Users Operations')
@Controller('users/bulk')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class BulkUsersController {
  constructor(private readonly bulkOperationsService: BulkOperationsService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import users from CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file to import',
        },
        options: {
          type: 'string',
          description: 'Import options as JSON string',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Import job created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or options' })
  async importUsers(
    @UploadedFile() file: Express.Multer.File,
    @Body('options') optionsString: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: any
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let options: BulkImportDto = {};
    if (optionsString) {
      try {
        options = JSON.parse(optionsString);
      } catch (error) {
        throw new BadRequestException('Invalid options JSON');
      }
    }

    // JWT payload uses 'sub' field for user ID
    const userId = user?.sub;
    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }

    const job = await this.bulkOperationsService.startBulkImport(
      file,
      options,
      tenantId,
      userId
    );

    return {
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        totalRecords: job.totalRecords,
        fileName: job.fileName,
        createdAt: job.createdAt,
      },
      message: 'Import job created successfully',
    };
  }

  @Get('import/:jobId/progress')
  @ApiOperation({ summary: 'Get import job progress' })
  @ApiParam({ name: 'jobId', description: 'Import job ID' })
  @ApiResponse({
    status: 200,
    description: 'Import progress retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Import job not found' })
  async getImportProgress(
    @Param('jobId') jobId: string,
    @TenantId() tenantId: string
  ): Promise<ImportProgressDto> {
    return await this.bulkOperationsService.getImportProgress(jobId, tenantId);
  }

  @Get('import/:jobId/errors')
  @ApiOperation({ summary: 'Get import errors' })
  @ApiParam({ name: 'jobId', description: 'Import job ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Import errors retrieved successfully',
  })
  async getImportErrors(
    @Param('jobId') jobId: string,
    @Query() query: PaginationDto,
    @TenantId() tenantId: string
  ) {
    const result = await this.bulkOperationsService.getImportErrors(
      jobId,
      query,
      tenantId
    );

    return {
      success: true,
      data: result.errors,
      pagination: result.pagination,
    };
  }

  @Get('import/:jobId/errors/summary')
  @ApiOperation({ summary: 'Get import error summary' })
  @ApiParam({ name: 'jobId', description: 'Import job ID' })
  @ApiResponse({
    status: 200,
    description: 'Error summary retrieved successfully',
  })
  async getImportErrorSummary(
    @Param('jobId') jobId: string,
    @TenantId() tenantId: string
  ) {
    const summary = await this.bulkOperationsService.getImportErrorSummary(
      jobId,
      tenantId
    );

    return {
      success: true,
      data: summary,
    };
  }

  @Get('import/:jobId/errors/export')
  @ApiOperation({ summary: 'Export import errors to CSV' })
  @ApiParam({ name: 'jobId', description: 'Import job ID' })
  @ApiResponse({ status: 200, description: 'Errors exported successfully' })
  async exportImportErrors(
    @Param('jobId') jobId: string,
    @TenantId() tenantId: string,
    @Res() res: Response
  ) {
    const result = await this.bulkOperationsService.exportImportErrors(
      jobId,
      tenantId
    );

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`
    );
    res.send(result.buffer);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export users to CSV/Excel' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Fields to include',
    isArray: true,
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Export format (csv/xlsx)',
  })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({ name: 'team', required: false, description: 'Filter by team' })
  @ApiResponse({ status: 200, description: 'Users exported successfully' })
  async exportUsers(
    @Query() filters: BulkExportDto,
    @TenantId() tenantId: string,
    @Res() res: Response
  ) {
    const result = await this.bulkOperationsService.startBulkExport(
      filters,
      tenantId
    );

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`
    );
    res.send(result.buffer);
  }

  @Get('export/template')
  @ApiOperation({ summary: 'Generate import template' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Fields to include',
    isArray: true,
  })
  @ApiResponse({ status: 200, description: 'Template generated successfully' })
  async generateImportTemplate(
    @Query('fields')
    fields: string | string[] = [
      'email',
      'firstName',
      'lastName',
      'role',
      'status',
    ],
    @Res() res: Response
  ) {
    // Ensure fields is always an array
    const fieldsArray = Array.isArray(fields)
      ? fields
      : typeof fields === 'string'
        ? fields.trim() === ''
          ? ['email', 'firstName', 'lastName', 'role', 'status']
          : fields.split(',').map(field => field.trim())
        : ['email', 'firstName', 'lastName', 'role', 'status'];

    const result =
      await this.bulkOperationsService.generateImportTemplate(fieldsArray);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`
    );
    res.send(result.buffer);
  }

  @Get('export/statistics')
  @ApiOperation({ summary: 'Get export statistics' })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Fields to include',
    isArray: true,
  })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiResponse({
    status: 200,
    description: 'Export statistics retrieved successfully',
  })
  async getExportStatistics(
    @Query() filters: BulkExportDto,
    @TenantId() tenantId: string
  ) {
    const statistics = await this.bulkOperationsService.getExportStatistics(
      filters,
      tenantId
    );

    return {
      success: true,
      data: statistics,
    };
  }

  @Post('import/:jobId/cancel')
  @ApiOperation({ summary: 'Cancel import job' })
  @ApiParam({ name: 'jobId', description: 'Import job ID' })
  @ApiResponse({
    status: 200,
    description: 'Import job cancelled successfully',
  })
  async cancelImportJob(
    @Param('jobId') jobId: string,
    @TenantId() tenantId: string
  ) {
    await this.bulkOperationsService.cancelImportJob(jobId, tenantId);

    return {
      success: true,
      message: 'Import job cancelled successfully',
    };
  }

  @Post('import/:jobId/retry')
  @ApiOperation({ summary: 'Retry failed import job' })
  @ApiParam({ name: 'jobId', description: 'Import job ID' })
  @ApiResponse({
    status: 200,
    description: 'Import job retry initiated successfully',
  })
  async retryImportJob(
    @Param('jobId') jobId: string,
    @TenantId() tenantId: string
  ) {
    const job = await this.bulkOperationsService.retryImportJob(
      jobId,
      tenantId
    );

    return {
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
      },
      message: 'Import job retry initiated successfully',
    };
  }

  @Get('import/jobs/recent')
  @ApiOperation({ summary: 'Get recent import jobs' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of jobs to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent jobs retrieved successfully',
  })
  async getRecentImportJobs(
    @Query('limit') limit: number = 10,
    @TenantId() tenantId: string
  ) {
    const jobs = await this.bulkOperationsService.getRecentImportJobs(
      tenantId,
      limit
    );

    return {
      success: true,
      data: jobs,
    };
  }

  @Get('import/jobs/statistics')
  @ApiOperation({ summary: 'Get import job statistics' })
  @ApiResponse({
    status: 200,
    description: 'Job statistics retrieved successfully',
  })
  async getImportJobStatistics(@TenantId() tenantId: string) {
    const statistics =
      await this.bulkOperationsService.getImportJobStatistics(tenantId);

    return {
      success: true,
      data: statistics,
    };
  }

  @Post('import/validate')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Validate import file before processing' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'File validation completed' })
  async validateImportFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('options') optionsString: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let options: BulkImportDto = {};
    if (optionsString) {
      try {
        options = JSON.parse(optionsString);
      } catch (error) {
        throw new BadRequestException('Invalid options JSON');
      }
    }

    const validation = await this.bulkOperationsService.validateImportFile(
      file,
      options
    );

    return {
      success: true,
      data: validation,
    };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get bulk operations dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboardData(@TenantId() tenantId: string) {
    const dashboardData =
      await this.bulkOperationsService.getDashboardData(tenantId);

    return {
      success: true,
      data: dashboardData,
    };
  }
}
