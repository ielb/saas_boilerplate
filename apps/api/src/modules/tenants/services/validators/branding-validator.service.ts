import { Injectable, Logger } from '@nestjs/common';
import { IBrandingValidator } from './branding-validator.interface';
import { ColorValidatorService } from './color-validator.service';
import { LogoValidatorService } from './logo-validator.service';
import { CssValidatorService } from './css-validator.service';
import { validate } from 'class-validator';
import { UpdateTenantBrandingDto } from '../../dto/tenant-branding.dto';

@Injectable()
export class BrandingValidatorService implements IBrandingValidator {
  private readonly logger = new Logger(BrandingValidatorService.name);

  constructor(
    private readonly colorValidator: ColorValidatorService,
    private readonly logoValidator: LogoValidatorService,
    private readonly cssValidator: CssValidatorService
  ) {}

  async validate(branding: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Step 1: Class-validator validation
    const dto = Object.assign(new UpdateTenantBrandingDto(), branding);
    const validationErrors = await validate(dto);

    for (const error of validationErrors) {
      if (error.constraints) {
        Object.values(error.constraints).forEach(constraint => {
          errors.push(constraint);
        });
      }
    }

    // Step 2: Custom color validation
    if (branding.colorScheme) {
      const colorErrors = this.validateColors(branding.colorScheme);
      errors.push(...colorErrors);

      const colorWarnings = this.colorValidator.validateColorAccessibility(
        branding.colorScheme
      );
      warnings.push(...colorWarnings);
    }

    // Step 3: Logo validation
    if (branding.logo) {
      const logoValidation = await this.validateLogo(branding.logo);
      errors.push(...logoValidation.errors);
      warnings.push(...logoValidation.warnings);
    }

    // Step 4: CSS validation
    if (branding.customCss) {
      const cssValidation = this.cssValidator.validateCustomCss(
        branding.customCss
      );
      if (!cssValidation.isValid) {
        errors.push(...cssValidation.errors);
      }
      warnings.push(...cssValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateColors(colorScheme: any): string[] {
    const errors: string[] = [];
    const requiredColors = [
      'primary',
      'secondary',
      'accent',
      'background',
      'text',
    ];

    for (const colorName of requiredColors) {
      const color = colorScheme[colorName];
      if (color && !this.colorValidator.validateHexColor(color)) {
        errors.push(
          `${colorName} color must be a valid hex color (e.g., #FF5733)`
        );
      }
    }

    return errors;
  }

  private async validateLogo(
    logo: any
  ): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate logo URL if provided
    if (logo.url) {
      const isUrlValid = await this.logoValidator.validateLogoUrl(logo.url);
      if (!isUrlValid) {
        warnings.push('Unable to verify logo URL accessibility');
      }
    }

    // Validate logo dimensions
    if (logo.width || logo.height) {
      const dimensionErrors = this.logoValidator.validateLogoDimensions(
        logo.width,
        logo.height
      );
      errors.push(...dimensionErrors);
    }

    return { errors, warnings };
  }
}
