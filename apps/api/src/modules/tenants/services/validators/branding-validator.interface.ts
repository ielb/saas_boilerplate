export interface IBrandingValidator {
  validate(branding: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
}

export interface IColorValidator {
  validateHexColor(color: string): boolean;
  calculateContrast(color1: string, color2: string): number;
  validateColorAccessibility(colors: any): string[];
}

export interface ILogoValidator {
  validateLogoUrl(url: string): Promise<boolean>;
  validateLogoDimensions(width: string, height: string): string[];
}

export interface ICssValidator {
  validateCustomCss(css: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}
