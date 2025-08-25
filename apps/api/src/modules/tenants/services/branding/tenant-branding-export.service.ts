import { Injectable, Logger } from '@nestjs/common';
import { AuditEventType } from '../../../audit/entities/audit-log.entity';
import { AuditService } from '../../../audit/services/audit.service';
import { GetTenantBrandingResponseDto } from '../../dto/tenant-branding.dto';

@Injectable()
export class TenantBrandingExportService {
  private readonly logger = new Logger(TenantBrandingExportService.name);

  constructor(private readonly auditService: AuditService) {}

  /**
   * Export branding configuration
   */
  async exportBranding(
    tenantId: string,
    userId: string,
    branding: GetTenantBrandingResponseDto
  ): Promise<{ configuration: any; exportDate: Date }> {
    this.logger.debug(`Exporting branding for tenant: ${tenantId}`);

    const configuration = {
      version: '1.0',
      exportDate: new Date(),
      tenant: {
        id: tenantId,
        name: branding.tenant.name,
      },
      branding: branding.branding,
    };

    // Log audit event
    await this.auditService.logEvent({
      eventType: AuditEventType.TENANT_BRANDING_EXPORTED,
      userId,
      tenantId,
      metadata: {
        exportDate: new Date(),
      },
    });

    return {
      configuration,
      exportDate: new Date(),
    };
  }

  /**
   * Import branding configuration
   */
  async importBranding(
    tenantId: string,
    userId: string,
    configuration: any
  ): Promise<void> {
    this.logger.debug(`Importing branding for tenant: ${tenantId}`);

    // Log audit event
    await this.auditService.logEvent({
      eventType: AuditEventType.TENANT_BRANDING_IMPORTED,
      userId,
      tenantId,
      metadata: {
        importedBranding: configuration.branding,
        importDate: configuration.exportDate,
      },
    });
  }

  /**
   * Generate branding configuration template
   */
  generateTemplate(): any {
    return {
      version: '1.0',
      exportDate: new Date(),
      tenant: {
        id: '',
        name: '',
      },
      branding: {
        theme: 'light',
        logo: {
          url: '',
          type: 'image',
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
      },
    };
  }

  /**
   * Validate export configuration format
   */
  validateExportFormat(configuration: any): boolean {
    return !!(
      configuration?.version &&
      configuration?.tenant?.id &&
      configuration?.tenant?.name &&
      configuration?.branding
    );
  }
}
