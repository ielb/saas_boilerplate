import { TenantFeature } from '../../auth/entities/tenant-feature-flag.entity';

/**
 * Convert feature names to enum values
 */
export function convertFeatureToEnum(feature: string): TenantFeature | null {
  // Handle null/undefined inputs
  if (!feature) {
    return null;
  }
  
  // Normalize the input to lowercase for case-insensitive matching
  const normalizedFeature = feature.toLowerCase();

  const featureMap: Record<string, TenantFeature> = {
    // snake_case format (normalized to lowercase)
    mfa_enforcement: TenantFeature.MFA_ENFORCEMENT,
    sso_integration: TenantFeature.SSO_INTEGRATION,
    password_policy: TenantFeature.PASSWORD_POLICY,
    bulk_user_import: TenantFeature.BULK_USER_IMPORT,
    user_provisioning: TenantFeature.USER_PROVISIONING,
    advanced_roles: TenantFeature.ADVANCED_ROLES,
    email_templates: TenantFeature.EMAIL_TEMPLATES,
    sms_notifications: TenantFeature.SMS_NOTIFICATIONS,
    push_notifications: TenantFeature.PUSH_NOTIFICATIONS,
    advanced_file_management: TenantFeature.ADVANCED_FILE_MANAGEMENT,
    file_versioning: TenantFeature.FILE_VERSIONING,
    file_encryption: TenantFeature.FILE_ENCRYPTION,
    advanced_analytics: TenantFeature.ADVANCED_ANALYTICS,
    custom_reports: TenantFeature.CUSTOM_REPORTS,
    export_capabilities: TenantFeature.EXPORT_CAPABILITIES,
    api_webhooks: TenantFeature.API_WEBHOOKS,
    third_party_integrations: TenantFeature.THIRD_PARTY_INTEGRATIONS,
    custom_integrations: TenantFeature.CUSTOM_INTEGRATIONS,
    advanced_security: TenantFeature.ADVANCED_SECURITY,
    audit_logging: TenantFeature.AUDIT_LOGGING,
    compliance_reporting: TenantFeature.COMPLIANCE_REPORTING,
    usage_based_billing: TenantFeature.USAGE_BASED_BILLING,
    advanced_billing: TenantFeature.ADVANCED_BILLING,
    invoice_customization: TenantFeature.INVOICE_CUSTOMIZATION,
    websocket_features: TenantFeature.WEBSOCKET_FEATURES,
    real_time_collaboration: TenantFeature.REAL_TIME_COLLABORATION,
    live_chat: TenantFeature.LIVE_CHAT,
    admin_dashboard: TenantFeature.ADMIN_DASHBOARD,
    system_monitoring: TenantFeature.SYSTEM_MONITORING,
    backup_restore: TenantFeature.BACKUP_RESTORE,
  };

  return featureMap[normalizedFeature] || null;
}

/**
 * Get all valid feature values for error messages
 */
export function getValidFeatures(): string[] {
  return Object.values(TenantFeature);
}

/**
 * Validate if a feature string is valid
 */
export function isValidFeature(feature: string): boolean {
  return convertFeatureToEnum(feature) !== null;
}
