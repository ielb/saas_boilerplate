import { Injectable, Logger } from '@nestjs/common';
import { ILogoValidator } from './branding-validator.interface';
import axios from 'axios';

@Injectable()
export class LogoValidatorService implements ILogoValidator {
  private readonly logger = new Logger(LogoValidatorService.name);

  async validateLogoUrl(url: string): Promise<boolean> {
    if (!url) return false;

    try {
      await axios.head(url, { timeout: 5000 });
      return true;
    } catch (error) {
      this.logger.warn(
        `Logo URL validation failed for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  validateLogoDimensions(width: string, height: string): string[] {
    const errors: string[] = [];

    if (!width || !height) {
      errors.push('Logo width and height are required');
      return errors;
    }

    const widthNum = parseInt(width);
    const heightNum = parseInt(height);

    if (isNaN(widthNum) || isNaN(heightNum)) {
      errors.push('Logo width and height must be valid numbers');
      return errors;
    }

    if (widthNum < 50 || widthNum > 1000) {
      errors.push('Logo width must be between 50 and 1000 pixels');
    }

    if (heightNum < 20 || heightNum > 300) {
      errors.push('Logo height must be between 20 and 300 pixels');
    }

    return errors;
  }
}
