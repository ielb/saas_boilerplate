import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../entities';
import {
  BrandingTheme,
  LogoType,
  GetTenantBrandingResponseDto,
} from '../../dto/tenant-branding.dto';

@Injectable()
export class TenantBrandingDataService {
  private readonly logger = new Logger(TenantBrandingDataService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>
  ) {}

  /**
   * Get tenant branding configuration
   */
  async getTenantBranding(
    tenantId: string
  ): Promise<GetTenantBrandingResponseDto> {
    this.logger.debug(`Getting branding data for tenant: ${tenantId}`);

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'name', 'domain', 'settings', 'updatedAt'],
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Extract branding from settings
    const branding = this.extractBrandingFromSettings(tenant.settings);

    return {
      success: true,
      branding,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        ...(tenant.domain && { domain: tenant.domain }),
      },
      updatedAt: tenant.updatedAt,
    };
  }

  /**
   * Update tenant branding configuration
   */
  async updateTenantBranding(
    tenantId: string,
    userId: string,
    brandingDto: any
  ): Promise<void> {
    this.logger.debug(`Updating branding data for tenant: ${tenantId}`);

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'settings'],
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Update tenant settings with new branding
    const updatedSettings = {
      ...tenant.settings,
      branding: {
        ...(tenant.settings?.branding || {}),
        ...brandingDto,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    };

    await this.tenantRepository.update(tenantId, {
      settings: updatedSettings,
    });
  }

  /**
   * Reset tenant branding to default
   */
  async resetTenantBranding(tenantId: string, userId: string): Promise<void> {
    this.logger.debug(`Resetting branding data for tenant: ${tenantId}`);

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'settings'],
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Get default branding
    const defaultBranding = this.getDefaultBranding();

    // Update tenant settings with default branding
    const updatedSettings = {
      ...tenant.settings,
      branding: {
        ...defaultBranding,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    };

    await this.tenantRepository.update(tenantId, {
      settings: updatedSettings,
    });
  }

  /**
   * Import branding configuration
   */
  async importBranding(
    tenantId: string,
    userId: string,
    configuration: any
  ): Promise<void> {
    this.logger.debug(`Importing branding data for tenant: ${tenantId}`);

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'settings'],
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Update tenant settings with imported branding
    const updatedSettings = {
      ...tenant.settings,
      branding: {
        ...configuration.branding,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    };

    await this.tenantRepository.update(tenantId, {
      settings: updatedSettings,
    });
  }

  /**
   * Get default branding configuration
   */
  getDefaultBranding(): any {
    return {
      theme: BrandingTheme.LIGHT,
      logo: {
        url: '',
        type: LogoType.IMAGE,
        width: '200',
        height: '60',
        altText: 'Company Logo',
      },
      colorScheme: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        accent: '#10B981',
        background: '#FFFFFF',
        text: '#1F2937',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '16px',
        lineHeight: '1.5',
        headingFontFamily: 'Inter, system-ui, sans-serif',
        headingFontSize: '24px',
        headingLineHeight: '1.25',
      },
      customCss: '',
    };
  }

  /**
   * Extract branding from tenant settings
   */
  private extractBrandingFromSettings(settings: any): any {
    if (!settings?.branding) {
      return this.getDefaultBranding();
    }

    return {
      ...this.getDefaultBranding(),
      ...settings.branding,
    };
  }
}
