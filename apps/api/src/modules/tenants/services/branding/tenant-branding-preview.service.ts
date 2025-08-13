import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TenantBrandingPreviewService {
  private readonly logger = new Logger(TenantBrandingPreviewService.name);

  /**
   * Generate preview URL for branding
   */
  generatePreviewUrl(branding: any): string {
    this.logger.debug('Generating preview URL for branding');

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

    if (branding.colorScheme?.background) {
      params.append('backgroundColor', branding.colorScheme.background);
    }

    if (branding.colorScheme?.text) {
      params.append('textColor', branding.colorScheme.text);
    }

    if (branding.typography?.fontFamily) {
      params.append('fontFamily', branding.typography.fontFamily);
    }

    if (branding.typography?.fontSize) {
      params.append('fontSize', branding.typography.fontSize);
    }

    if (branding.logo?.url) {
      params.append('logoUrl', branding.logo.url);
    }

    if (branding.customCss) {
      params.append('customCss', encodeURIComponent(branding.customCss));
    }

    return `/api/tenants/branding/preview?${params.toString()}`;
  }

  /**
   * Generate CSS variables from branding configuration
   */
  generateCssVariables(branding: any): string {
    this.logger.debug('Generating CSS variables from branding');

    const variables = [];

    // Color scheme variables
    if (branding.colorScheme) {
      Object.entries(branding.colorScheme).forEach(([key, value]) => {
        variables.push(`--brand-${key}: ${value};`);
      });
    }

    // Typography variables
    if (branding.typography) {
      if (branding.typography.fontFamily) {
        variables.push(
          `--brand-font-family: ${branding.typography.fontFamily};`
        );
      }
      if (branding.typography.fontSize) {
        variables.push(`--brand-font-size: ${branding.typography.fontSize};`);
      }
      if (branding.typography.lineHeight) {
        variables.push(
          `--brand-line-height: ${branding.typography.lineHeight};`
        );
      }
      if (branding.typography.headingFontFamily) {
        variables.push(
          `--brand-heading-font-family: ${branding.typography.headingFontFamily};`
        );
      }
      if (branding.typography.headingFontSize) {
        variables.push(
          `--brand-heading-font-size: ${branding.typography.headingFontSize};`
        );
      }
      if (branding.typography.headingLineHeight) {
        variables.push(
          `--brand-heading-line-height: ${branding.typography.headingLineHeight};`
        );
      }
    }

    // Theme variable
    if (branding.theme) {
      variables.push(`--brand-theme: ${branding.theme};`);
    }

    return `:root {\n  ${variables.join('\n  ')}\n}`;
  }

  /**
   * Generate complete CSS from branding configuration
   */
  generateCompleteCss(branding: any): string {
    this.logger.debug('Generating complete CSS from branding');

    const cssVariables = this.generateCssVariables(branding);
    const customCss = branding.customCss || '';

    return `${cssVariables}\n\n${customCss}`;
  }

  /**
   * Validate preview parameters
   */
  validatePreviewParameters(params: any): boolean {
    this.logger.debug('Validating preview parameters');

    // Basic validation - at least one branding parameter should be present
    return !!(
      params.theme ||
      params.primaryColor ||
      params.secondaryColor ||
      params.accentColor ||
      params.backgroundColor ||
      params.textColor ||
      params.fontFamily ||
      params.fontSize ||
      params.logoUrl ||
      params.customCss
    );
  }
}
