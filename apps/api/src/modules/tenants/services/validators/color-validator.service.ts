import { Injectable } from '@nestjs/common';
import { IColorValidator } from './branding-validator.interface';

@Injectable()
export class ColorValidatorService implements IColorValidator {
  validateHexColor(color: string): boolean {
    if (!color) return false;
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    return hexColorRegex.test(color);
  }

  calculateContrast(color1: string, color2: string): number {
    if (!color1 || !color2) return 0;

    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');

    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);

    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);

    const luminance1 = (0.299 * r1 + 0.587 * g1 + 0.114 * b1) / 255;
    const luminance2 = (0.299 * r2 + 0.587 * g2 + 0.114 * b2) / 255;

    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  validateColorAccessibility(colors: any): string[] {
    const warnings: string[] = [];

    // Check text/background contrast
    if (colors.background && colors.text) {
      const contrast = this.calculateContrast(colors.background, colors.text);
      if (contrast < 4.5) {
        warnings.push(
          'Text and background colors may not provide sufficient contrast for accessibility'
        );
      }
    }

    // Check primary/secondary color contrast for color blindness
    if (colors.primary && colors.secondary) {
      const contrast = this.calculateContrast(colors.primary, colors.secondary);
      if (contrast < 3.0) {
        warnings.push(
          'Primary and secondary colors may not be distinguishable for color-blind users'
        );
      }
    }

    return warnings;
  }
}
