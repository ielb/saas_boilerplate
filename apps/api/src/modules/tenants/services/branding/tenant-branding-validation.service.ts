import { Injectable, Logger } from '@nestjs/common';
import { BrandingValidatorService } from '../validators/branding-validator.service';
import {
  ValidateBrandingDto,
  BrandingValidationResponseDto,
  UpdateTenantBrandingDto,
} from '../../dto/tenant-branding.dto';

@Injectable()
export class TenantBrandingValidationService {
  private readonly logger = new Logger(TenantBrandingValidationService.name);

  constructor(private readonly brandingValidator: BrandingValidatorService) {}

  /**
   * Validate branding configuration
   */
  async validateBrandingConfiguration(
    brandingDto: ValidateBrandingDto
  ): Promise<BrandingValidationResponseDto> {
    this.logger.debug('Validating branding configuration');

    const validation = await this.brandingValidator.validate(brandingDto);

    return {
      ...validation,
      ...(validation.isValid && {
        previewUrl: this.generatePreviewUrl(brandingDto),
      }),
    };
  }

  /**
   * Validate branding for update operations
   */
  async validateForUpdate(
    brandingDto: UpdateTenantBrandingDto
  ): Promise<BrandingValidationResponseDto> {
    this.logger.debug('Validating branding for update');

    return await this.brandingValidator.validate(brandingDto);
  }

  /**
   * Validate imported branding configuration
   */
  async validateImportedConfiguration(
    configuration: any
  ): Promise<BrandingValidationResponseDto> {
    this.logger.debug('Validating imported branding configuration');

    if (!configuration?.branding) {
      return {
        isValid: false,
        errors: ['Configuration must contain branding data'],
        warnings: [],
      };
    }

    return await this.brandingValidator.validate(configuration.branding);
  }

  /**
   * Generate preview URL for branding
   */
  private generatePreviewUrl(branding: any): string {
    const params = new URLSearchParams();

    if (branding.theme) {
      params.append('theme', branding.theme);
    }

    if (branding.colorScheme?.primary) {
      params.append('primaryColor', branding.colorScheme.primary);
    }

    if (branding.colorScheme?.secondary) {
      params.append('secondaryColor', branding.colorScheme.secondary);
    }

    if (branding.colorScheme?.accent) {
      params.append('accentColor', branding.colorScheme.accent);
    }

    return `/api/tenants/branding/preview?${params.toString()}`;
  }
}
