import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { AuthGuard } from '../../auth/guards/auth.guard';
import { TenantBrandingService } from '../services/tenant-branding.service';
import {
  UpdateTenantBrandingDto,
  TenantBrandingResponseDto,
  GetTenantBrandingResponseDto,
  ValidateBrandingDto,
  BrandingValidationResponseDto,
} from '../dto/tenant-branding.dto';

@ApiTags('Tenant Branding')
@Controller('tenants/branding')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class TenantBrandingController {
  private readonly logger = new Logger(TenantBrandingController.name);

  constructor(private readonly tenantBrandingService: TenantBrandingService) {}

  @Get()
  @ApiOperation({
    summary: 'Get tenant branding configuration',
    description: 'Retrieve the current branding configuration for the tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant branding configuration retrieved successfully',
    type: GetTenantBrandingResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have access to the tenant',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getTenantBranding(
    @Request() req: any
  ): Promise<GetTenantBrandingResponseDto> {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    this.logger.debug(`Getting branding for tenant: ${tenantId}`);

    return await this.tenantBrandingService.getTenantBranding(tenantId, userId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update tenant branding configuration',
    description:
      'Update the branding configuration for the tenant (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant branding updated successfully',
    type: TenantBrandingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid branding configuration',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async updateTenantBranding(
    @Request() req: any,
    @Body() brandingDto: UpdateTenantBrandingDto
  ): Promise<TenantBrandingResponseDto> {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    this.logger.debug(`Updating branding for tenant: ${tenantId}`);

    return await this.tenantBrandingService.updateTenantBranding(
      tenantId,
      userId,
      brandingDto
    );
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate branding configuration',
    description: 'Validate a branding configuration without applying it',
  })
  @ApiResponse({
    status: 200,
    description: 'Branding configuration validation completed',
    type: BrandingValidationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid branding configuration',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async validateBranding(
    @Body() validateDto: ValidateBrandingDto
  ): Promise<BrandingValidationResponseDto> {
    this.logger.debug('Validating branding configuration');

    return await this.tenantBrandingService.validateBrandingConfiguration(
      validateDto
    );
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset tenant branding to default',
    description:
      'Reset the tenant branding configuration to default values (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant branding reset successfully',
    type: TenantBrandingResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async resetTenantBranding(
    @Request() req: any
  ): Promise<TenantBrandingResponseDto> {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    this.logger.debug(`Resetting branding for tenant: ${tenantId}`);

    return await this.tenantBrandingService.resetTenantBranding(
      tenantId,
      userId
    );
  }

  @Get('preview')
  @ApiOperation({
    summary: 'Get branding preview URL',
    description: 'Get a preview URL for the current branding configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Branding preview URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        previewUrl: {
          type: 'string',
          example:
            '/api/tenants/branding/preview?theme=light&primaryColor=%233B82F6',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have access to the tenant',
  })
  async getBrandingPreview(
    @Request() req: any
  ): Promise<{ previewUrl: string }> {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    this.logger.debug(`Getting branding preview for tenant: ${tenantId}`);

    return await this.tenantBrandingService.getBrandingPreview(
      tenantId,
      userId
    );
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export branding configuration',
    description: 'Export the current branding configuration as JSON',
  })
  @ApiResponse({
    status: 200,
    description: 'Branding configuration exported successfully',
    schema: {
      type: 'object',
      properties: {
        configuration: {
          type: 'object',
          description: 'Branding configuration object',
        },
        exportDate: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have access to the tenant',
  })
  async exportBranding(
    @Request() req: any
  ): Promise<{ configuration: any; exportDate: Date }> {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    this.logger.debug(`Exporting branding for tenant: ${tenantId}`);

    return await this.tenantBrandingService.exportBranding(tenantId, userId);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import branding configuration',
    description: 'Import a branding configuration from JSON (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Branding configuration imported successfully',
    type: TenantBrandingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid imported branding configuration',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async importBranding(
    @Request() req: any,
    @Body() configuration: any
  ): Promise<TenantBrandingResponseDto> {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    this.logger.debug(`Importing branding for tenant: ${tenantId}`);

    return await this.tenantBrandingService.importBranding(
      tenantId,
      userId,
      configuration
    );
  }

  @Get('default')
  @ApiOperation({
    summary: 'Get default branding configuration',
    description: 'Get the default branding configuration template',
  })
  @ApiResponse({
    status: 200,
    description: 'Default branding configuration retrieved successfully',
    type: UpdateTenantBrandingDto,
  })
  async getDefaultBranding(): Promise<UpdateTenantBrandingDto> {
    this.logger.debug('Getting default branding configuration');

    return this.tenantBrandingService.getBrandingTemplate();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Branding service health check',
    description: 'Check the health status of the branding service',
  })
  @ApiResponse({
    status: 200,
    description: 'Branding service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
        },
        service: {
          type: 'string',
          example: 'tenant-branding',
        },
        version: {
          type: 'string',
          example: '1.0.0',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:30:00.000Z',
        },
      },
    },
  })
  async healthCheck(): Promise<{
    status: string;
    service: string;
    version: string;
    timestamp: Date;
  }> {
    return {
      status: 'ok',
      service: 'tenant-branding',
      version: '1.0.0',
      timestamp: new Date(),
    };
  }
}
