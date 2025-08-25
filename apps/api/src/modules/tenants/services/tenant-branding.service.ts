import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AuditEventType } from '../../audit/entities/audit-log.entity';
import { AuditService } from '../../audit/services/audit.service';
import { TenantAccessControlService } from './access/tenant-access-control.service';
import { TenantBrandingCacheService } from './cache/tenant-branding-cache.service';
import { TenantBrandingValidationService } from './branding/tenant-branding-validation.service';
import { TenantBrandingDataService } from './branding/tenant-branding-data.service';
import { TenantBrandingExportService } from './branding/tenant-branding-export.service';
import { TenantBrandingPreviewService } from './branding/tenant-branding-preview.service';
import {
  UpdateTenantBrandingDto,
  TenantBrandingResponseDto,
  GetTenantBrandingResponseDto,
  ValidateBrandingDto,
  BrandingValidationResponseDto,
} from '../dto/tenant-branding.dto';

@Injectable()
export class TenantBrandingService {
  private readonly logger = new Logger(TenantBrandingService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly accessControl: TenantAccessControlService,
    private readonly brandingCache: TenantBrandingCacheService,
    private readonly brandingValidation: TenantBrandingValidationService,
    private readonly brandingData: TenantBrandingDataService,
    private readonly brandingExport: TenantBrandingExportService,
    private readonly brandingPreview: TenantBrandingPreviewService
  ) {}

  /**
   * Get tenant branding configuration
   */
  async getTenantBranding(
    tenantId: string,
    userId: string
  ): Promise<GetTenantBrandingResponseDto> {
    this.logger.debug(`Getting branding for tenant: ${tenantId}`);

    // Check cache first
    const cached = await this.brandingCache.getBranding(tenantId);
    if (cached) {
      return cached;
    }

    // Verify user has access to tenant
    await this.accessControl.verifyTenantAccess(userId, tenantId);

    // Get branding data
    const response = await this.brandingData.getTenantBranding(tenantId);

    // Cache the result
    await this.brandingCache.setBranding(tenantId, response);

    return response;
  }

  /**
   * Update tenant branding configuration
   */
  async updateTenantBranding(
    tenantId: string,
    userId: string,
    brandingDto: UpdateTenantBrandingDto
  ): Promise<TenantBrandingResponseDto> {
    this.logger.debug(`Updating branding for tenant: ${tenantId}`);

    // Verify admin access
    await this.accessControl.verifyAdminAccess(userId, tenantId);

    // Validate branding configuration
    const validation =
      await this.brandingValidation.validateForUpdate(brandingDto);
    if (!validation.isValid) {
      throw new BadRequestException('Invalid branding configuration');
    }

    // Update branding data
    await this.brandingData.updateTenantBranding(tenantId, userId, brandingDto);

    // Clear cache
    await this.brandingCache.clearBranding(tenantId);

    // Log audit event
    await this.auditService.logEvent({
      eventType: AuditEventType.TENANT_BRANDING_UPDATED,
      userId,
      tenantId,
      metadata: {
        branding: brandingDto,
        validationWarnings: validation.warnings,
      },
    });

    return {
      success: true,
      message: 'Branding updated successfully',
      branding: brandingDto,
      updatedAt: new Date(),
    };
  }

  /**
   * Validate branding configuration
   */
  async validateBrandingConfiguration(
    brandingDto: ValidateBrandingDto
  ): Promise<BrandingValidationResponseDto> {
    this.logger.debug('Validating branding configuration');

    return await this.brandingValidation.validateBrandingConfiguration(
      brandingDto
    );
  }

  /**
   * Reset tenant branding to default
   */
  async resetTenantBranding(
    tenantId: string,
    userId: string
  ): Promise<TenantBrandingResponseDto> {
    this.logger.debug(`Resetting branding for tenant: ${tenantId}`);

    // Verify admin access
    await this.accessControl.verifyAdminAccess(userId, tenantId);

    // Reset branding data
    await this.brandingData.resetTenantBranding(tenantId, userId);

    // Clear cache
    await this.brandingCache.clearBranding(tenantId);

    // Get default branding
    const defaultBranding = this.brandingData.getDefaultBranding();

    // Log audit event
    await this.auditService.logEvent({
      eventType: AuditEventType.TENANT_BRANDING_RESET,
      userId,
      tenantId,
      metadata: {
        previousBranding: null, // Will be retrieved from cache if needed
      },
    });

    return {
      success: true,
      message: 'Branding reset to default successfully',
      branding: defaultBranding,
      updatedAt: new Date(),
    };
  }

  /**
   * Get branding preview URL
   */
  async getBrandingPreview(
    tenantId: string,
    userId: string
  ): Promise<{ previewUrl: string }> {
    this.logger.debug(`Getting branding preview for tenant: ${tenantId}`);

    // Verify user has access to tenant
    await this.accessControl.verifyTenantAccess(userId, tenantId);

    // Get current branding
    const branding = await this.getTenantBranding(tenantId, userId);
    const previewUrl = this.brandingPreview.generatePreviewUrl(
      branding.branding
    );

    return { previewUrl };
  }

  /**
   * Export branding configuration
   */
  async exportBranding(
    tenantId: string,
    userId: string
  ): Promise<{ configuration: any; exportDate: Date }> {
    this.logger.debug(`Exporting branding for tenant: ${tenantId}`);

    // Verify user has access to tenant
    await this.accessControl.verifyTenantAccess(userId, tenantId);

    // Get current branding
    const branding = await this.getTenantBranding(tenantId, userId);

    // Export branding
    return await this.brandingExport.exportBranding(tenantId, userId, branding);
  }

  /**
   * Import branding configuration
   */
  async importBranding(
    tenantId: string,
    userId: string,
    configuration: any
  ): Promise<TenantBrandingResponseDto> {
    this.logger.debug(`Importing branding for tenant: ${tenantId}`);

    // Verify admin access
    await this.accessControl.verifyAdminAccess(userId, tenantId);

    // Validate imported configuration
    const validation =
      await this.brandingValidation.validateImportedConfiguration(
        configuration
      );
    if (!validation.isValid) {
      throw new BadRequestException('Invalid imported branding configuration');
    }

    // Import branding data
    await this.brandingData.importBranding(tenantId, userId, configuration);

    // Clear cache
    await this.brandingCache.clearBranding(tenantId);

    // Log import event
    await this.brandingExport.importBranding(tenantId, userId, configuration);

    return {
      success: true,
      message: 'Branding imported successfully',
      branding: configuration.branding,
      updatedAt: new Date(),
    };
  }

  /**
   * Generate CSS from branding configuration
   */
  async generateBrandingCss(
    tenantId: string,
    userId: string
  ): Promise<{ css: string }> {
    this.logger.debug(`Generating CSS for tenant: ${tenantId}`);

    // Verify user has access to tenant
    await this.accessControl.verifyTenantAccess(userId, tenantId);

    // Get current branding
    const branding = await this.getTenantBranding(tenantId, userId);
    const css = this.brandingPreview.generateCompleteCss(branding.branding);

    return { css };
  }

  /**
   * Get branding configuration template
   */
  getBrandingTemplate(): any {
    return this.brandingExport.generateTemplate();
  }
}
