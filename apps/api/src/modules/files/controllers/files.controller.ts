import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  HttpCode,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Tenant, TenantId } from '../../../common/decorators/tenant.decorator';
import {
  FileRateLimit,
  FileRateLimitConfigs,
} from '../decorators/file-rate-limit.decorator';
import { User } from '../../users/entities/user.entity';
import { FileService } from '../services/file.service';
import { UploadFileDto } from '../dto/upload-file.dto';
import { FileQueryDto } from '../dto/file-query.dto';
import {
  FileUploadResponseDto,
  FileMetadataResponseDto,
  FileListResponseDto,
  FileHealthResponseDto,
  FileSignedUrlResponseDto,
  FileCopyMoveResponseDto,
} from '../dto/file-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/auth.decorator';
import { JwtPayload } from '@app/shared';

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload with metadata',
    type: UploadFileDto,
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: FileUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or metadata',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @FileRateLimit(FileRateLimitConfigs.STANDARD)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|gif|pdf|doc|docx|txt)$/,
          }),
        ],
      })
    )
    file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId?: string
  ): Promise<FileUploadResponseDto> {
    const fileData = await this.fileService.uploadFile(
      file,
      uploadDto,
      user.sub,
      tenantId
    );

    return {
      success: true,
      data: fileData,
      message: 'File uploaded successfully',
    };
  }

  @Get('metadata')
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiQuery({ name: 'key', description: 'File key', required: true })
  @ApiResponse({
    status: 200,
    description: 'File metadata retrieved successfully',
    type: FileMetadataResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getFileMetadata(
    @Query('key') key: string,
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId?: string
  ): Promise<FileMetadataResponseDto> {
    return this.fileService.getFile(key, user.sub, tenantId);
  }

  @Get('download')
  @ApiOperation({ summary: 'Download a file' })
  @ApiQuery({ name: 'key', description: 'File key', required: true })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async downloadFile(
    @Query('key') key: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @TenantId() tenantId?: string
  ): Promise<void> {
    const file = await this.fileService.getFile(key, user.sub, tenantId);
    const buffer = await this.fileService.downloadFile(key, user.sub, tenantId);

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.originalName}"`,
      'Content-Length': file.size.toString(),
    });

    res.send(buffer);
  }

  @Get('stream')
  @ApiOperation({ summary: 'Stream a file' })
  @ApiQuery({ name: 'key', description: 'File key', required: true })
  @ApiResponse({
    status: 200,
    description: 'File streamed successfully',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async streamFile(
    @Query('key') key: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @TenantId() tenantId?: string
  ): Promise<void> {
    const file = await this.fileService.getFile(key, user.sub, tenantId);
    const stream = await this.fileService.getFileStream(
      key,
      user.sub,
      tenantId
    );

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${file.originalName}"`,
      'Content-Length': file.size.toString(),
    });

    stream.pipe(res);
  }

  @Get('list')
  @ApiOperation({ summary: 'List files with filtering and pagination' })
  @ApiQuery({
    name: 'prefix',
    required: false,
    description: 'File prefix filter',
  })
  @ApiQuery({
    name: 'maxKeys',
    required: false,
    description: 'Maximum number of files to return',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'File status filter',
  })
  @ApiQuery({
    name: 'visibility',
    required: false,
    description: 'File visibility filter',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Files listed successfully',
    type: FileListResponseDto,
  })
  async listFiles(
    @Query() query: FileQueryDto,
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId?: string
  ): Promise<FileListResponseDto> {
    const result = await this.fileService.listFiles(query, user.sub, tenantId);

    return {
      success: true,
      data: result,
      message: 'Files listed successfully',
    };
  }

  @Delete()
  @ApiOperation({ summary: 'Delete a file' })
  @ApiQuery({ name: 'key', description: 'File key', required: true })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Query('key') key: string,
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId?: string
  ): Promise<void> {
    await this.fileService.deleteFile(key, user.sub, tenantId);
  }

  @Post('signed-url')
  @ApiOperation({ summary: 'Generate a signed URL for file access' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'File key' },
        expiresIn: {
          type: 'number',
          description: 'Expiration time in seconds',
          default: 3600,
        },
      },
      required: ['key'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL generated successfully',
    type: FileSignedUrlResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getSignedUrl(
    @Body() body: { key: string; expiresIn?: number },
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId?: string
  ): Promise<FileSignedUrlResponseDto> {
    const signedUrl = await this.fileService.getSignedUrl(
      body.key,
      body.expiresIn,
      user.sub,
      tenantId
    );
    const expiresAt = new Date(Date.now() + (body.expiresIn || 3600) * 1000);

    return {
      success: true,
      data: {
        signedUrl,
        expiresAt,
        key: body.key,
      },
      message: 'Signed URL generated successfully',
    };
  }

  @Get('public-url')
  @ApiOperation({ summary: 'Get public URL for a file' })
  @ApiQuery({ name: 'key', description: 'File key', required: true })
  @ApiResponse({
    status: 200,
    description: 'Public URL retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            publicUrl: { type: 'string' },
            key: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getPublicUrl(
    @Query('key') key: string,
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId?: string
  ): Promise<{
    success: boolean;
    data: { publicUrl: string; key: string };
    message: string;
  }> {
    const file = await this.fileService.getFile(key, user.sub, tenantId);

    return {
      success: true,
      data: {
        publicUrl: file.publicUrl || '',
        key: file.key,
      },
      message: 'Public URL retrieved successfully',
    };
  }

  @Post('copy')
  @ApiOperation({ summary: 'Copy a file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceKey: { type: 'string', description: 'Source file key' },
        destinationKey: { type: 'string', description: 'Destination file key' },
      },
      required: ['sourceKey', 'destinationKey'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File copied successfully',
    type: FileCopyMoveResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Source file not found' })
  @ApiResponse({ status: 400, description: 'Destination file already exists' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async copyFile(
    @Body() body: { sourceKey: string; destinationKey: string },
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId?: string
  ): Promise<FileCopyMoveResponseDto> {
    const fileData = await this.fileService.copyFile(
      body.sourceKey,
      body.destinationKey,
      user.sub,
      tenantId
    );

    return {
      success: true,
      data: {
        sourceKey: body.sourceKey,
        destinationKey: body.destinationKey,
        metadata: fileData,
      },
      message: 'File copied successfully',
    };
  }

  @Post('move')
  @ApiOperation({ summary: 'Move a file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceKey: { type: 'string', description: 'Source file key' },
        destinationKey: { type: 'string', description: 'Destination file key' },
      },
      required: ['sourceKey', 'destinationKey'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File moved successfully',
    type: FileCopyMoveResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Source file not found' })
  @ApiResponse({ status: 400, description: 'Destination file already exists' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async moveFile(
    @Body() body: { sourceKey: string; destinationKey: string },
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId?: string
  ): Promise<FileCopyMoveResponseDto> {
    const fileData = await this.fileService.moveFile(
      body.sourceKey,
      body.destinationKey,
      user.sub,
      tenantId
    );

    return {
      success: true,
      data: {
        sourceKey: body.sourceKey,
        destinationKey: body.destinationKey,
        metadata: fileData,
      },
      message: 'File moved successfully',
    };
  }

  @Get('exists')
  @ApiOperation({ summary: 'Check if a file exists' })
  @ApiQuery({ name: 'key', description: 'File key', required: true })
  @ApiResponse({
    status: 200,
    description: 'File existence checked successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            exists: { type: 'boolean' },
            key: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async fileExists(
    @Query('key') key: string,
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId?: string
  ): Promise<{
    success: boolean;
    data: { exists: boolean; key: string };
    message: string;
  }> {
    try {
      await this.fileService.getFile(key, user.sub, tenantId);
      return {
        success: true,
        data: { exists: true, key },
        message: 'File exists',
      };
    } catch (error) {
      return {
        success: true,
        data: { exists: false, key },
        message: 'File does not exist',
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Get storage health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
    type: FileHealthResponseDto,
  })
  async getHealthStatus(): Promise<FileHealthResponseDto> {
    const healthData = await this.fileService.getHealthStatus();

    return {
      success: true,
      data: {
        ...healthData,
        timestamp: new Date(),
      },
      message: 'Health status retrieved successfully',
    };
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get available storage providers' })
  @ApiResponse({
    status: 200,
    description: 'Storage providers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: { type: 'string' },
              priority: { type: 'number' },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async getProviders(): Promise<{
    success: boolean;
    data: any[];
    message: string;
  }> {
    const healthStatus = this.fileService.getHealthStatus();

    return {
      success: true,
      data: (await healthStatus).providers,
      message: 'Storage providers retrieved successfully',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get storage statistics' })
  @ApiResponse({
    status: 200,
    description: 'Storage statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalFiles: { type: 'number' },
            totalSize: { type: 'number' },
            averageFileSize: { type: 'number' },
            filesByStatus: { type: 'object' },
            filesByVisibility: { type: 'object' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async getStorageStats(
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId?: string
  ): Promise<{ success: boolean; data: any; message: string }> {
    const stats = await this.fileService.getStorageStats(tenantId);

    return {
      success: true,
      data: stats,
      message: 'Storage statistics retrieved successfully',
    };
  }
}
