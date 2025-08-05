import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

import { Tenant } from './tenant.entity';

export enum TenantFeature {
  // Authentication features
  MFA_ENFORCEMENT = 'mfa_enforcement',
  SSO_INTEGRATION = 'sso_integration',
  PASSWORD_POLICY = 'password_policy',

  // User management features
  BULK_USER_IMPORT = 'bulk_user_import',
  USER_PROVISIONING = 'user_provisioning',
  ADVANCED_ROLES = 'advanced_roles',

  // Communication features
  EMAIL_TEMPLATES = 'email_templates',
  SMS_NOTIFICATIONS = 'sms_notifications',
  PUSH_NOTIFICATIONS = 'push_notifications',

  // File management features
  ADVANCED_FILE_MANAGEMENT = 'advanced_file_management',
  FILE_VERSIONING = 'file_versioning',
  FILE_ENCRYPTION = 'file_encryption',

  // Analytics features
  ADVANCED_ANALYTICS = 'advanced_analytics',
  CUSTOM_REPORTS = 'custom_reports',
  EXPORT_CAPABILITIES = 'export_capabilities',

  // Integration features
  API_WEBHOOKS = 'api_webhooks',
  THIRD_PARTY_INTEGRATIONS = 'third_party_integrations',
  CUSTOM_INTEGRATIONS = 'custom_integrations',

  // Security features
  ADVANCED_SECURITY = 'advanced_security',
  AUDIT_LOGGING = 'audit_logging',
  COMPLIANCE_REPORTING = 'compliance_reporting',

  // Billing features
  USAGE_BASED_BILLING = 'usage_based_billing',
  ADVANCED_BILLING = 'advanced_billing',
  INVOICE_CUSTOMIZATION = 'invoice_customization',

  // Real-time features
  WEBSOCKET_FEATURES = 'websocket_features',
  REAL_TIME_COLLABORATION = 'real_time_collaboration',
  LIVE_CHAT = 'live_chat',

  // Administrative features
  ADMIN_DASHBOARD = 'admin_dashboard',
  SYSTEM_MONITORING = 'system_monitoring',
  BACKUP_RESTORE = 'backup_restore',
}

@Entity('tenant_feature_flags')
@Index(['tenantId', 'feature'], { unique: true })
@Index(['tenantId'])
@Index(['feature'])
export class TenantFeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @IsNotEmpty()
  tenantId!: string;

  @Column({
    type: 'enum',
    enum: TenantFeature,
  })
  @IsNotEmpty()
  feature!: TenantFeature;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isEnabled!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  config?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Tenant, tenant => tenant.id)
  @JoinColumn({ name: 'tenantId' })
  tenant?: Tenant;

  /**
   * Get feature configuration value
   */
  getConfigValue(key: string, defaultValue?: any): any {
    return this.config?.[key] ?? defaultValue;
  }

  /**
   * Set feature configuration value
   */
  setConfigValue(key: string, value: any): void {
    if (!this.config) {
      this.config = {};
    }
    this.config[key] = value;
  }

  /**
   * Check if feature is enabled with specific configuration
   */
  isFeatureEnabled(configKey?: string): boolean {
    if (!this.isEnabled) return false;

    if (configKey) {
      return this.getConfigValue(configKey, false);
    }

    return true;
  }

  /**
   * Get feature display name
   */
  get displayName(): string {
    return this.feature
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get feature description
   */
  get description(): string {
    const descriptions: Record<TenantFeature, string> = {
      [TenantFeature.MFA_ENFORCEMENT]:
        'Enforce multi-factor authentication for all users',
      [TenantFeature.SSO_INTEGRATION]: 'Enable single sign-on integration',
      [TenantFeature.PASSWORD_POLICY]: 'Advanced password policy enforcement',
      [TenantFeature.BULK_USER_IMPORT]: 'Import users in bulk via CSV',
      [TenantFeature.USER_PROVISIONING]: 'Automated user provisioning',
      [TenantFeature.ADVANCED_ROLES]: 'Advanced role-based access control',
      [TenantFeature.EMAIL_TEMPLATES]: 'Customizable email templates',
      [TenantFeature.SMS_NOTIFICATIONS]: 'SMS notification capabilities',
      [TenantFeature.PUSH_NOTIFICATIONS]: 'Push notification support',
      [TenantFeature.ADVANCED_FILE_MANAGEMENT]:
        'Advanced file management features',
      [TenantFeature.FILE_VERSIONING]: 'File versioning and history',
      [TenantFeature.FILE_ENCRYPTION]: 'File encryption at rest',
      [TenantFeature.ADVANCED_ANALYTICS]: 'Advanced analytics and insights',
      [TenantFeature.CUSTOM_REPORTS]: 'Custom report generation',
      [TenantFeature.EXPORT_CAPABILITIES]: 'Data export capabilities',
      [TenantFeature.API_WEBHOOKS]: 'API webhook support',
      [TenantFeature.THIRD_PARTY_INTEGRATIONS]: 'Third-party integrations',
      [TenantFeature.CUSTOM_INTEGRATIONS]: 'Custom integration capabilities',
      [TenantFeature.ADVANCED_SECURITY]: 'Advanced security features',
      [TenantFeature.AUDIT_LOGGING]: 'Comprehensive audit logging',
      [TenantFeature.COMPLIANCE_REPORTING]: 'Compliance reporting tools',
      [TenantFeature.USAGE_BASED_BILLING]: 'Usage-based billing',
      [TenantFeature.ADVANCED_BILLING]: 'Advanced billing features',
      [TenantFeature.INVOICE_CUSTOMIZATION]: 'Customizable invoices',
      [TenantFeature.WEBSOCKET_FEATURES]: 'WebSocket real-time features',
      [TenantFeature.REAL_TIME_COLLABORATION]: 'Real-time collaboration tools',
      [TenantFeature.LIVE_CHAT]: 'Live chat functionality',
      [TenantFeature.ADMIN_DASHBOARD]: 'Administrative dashboard',
      [TenantFeature.SYSTEM_MONITORING]: 'System monitoring and alerts',
      [TenantFeature.BACKUP_RESTORE]: 'Backup and restore capabilities',
    };

    return descriptions[this.feature] || 'Feature description not available';
  }
}
