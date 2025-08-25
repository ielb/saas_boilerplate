import { TenantFeature } from '../entities/tenant-feature-flag.entity';

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
    // Enum keys to values
    MFA_ENFORCEMENT: TenantFeature.MFA_ENFORCEMENT,
    SSO_INTEGRATION: TenantFeature.SSO_INTEGRATION,
    PASSWORD_POLICY: TenantFeature.PASSWORD_POLICY,
    BULK_USER_IMPORT: TenantFeature.BULK_USER_IMPORT,
    USER_PROVISIONING: TenantFeature.USER_PROVISIONING,
    ADVANCED_ROLES: TenantFeature.ADVANCED_ROLES,
    EMAIL_TEMPLATES: TenantFeature.EMAIL_TEMPLATES,
    SMS_NOTIFICATIONS: TenantFeature.SMS_NOTIFICATIONS,
    PUSH_NOTIFICATIONS: TenantFeature.PUSH_NOTIFICATIONS,
    ADVANCED_FILE_MANAGEMENT: TenantFeature.ADVANCED_FILE_MANAGEMENT,
    FILE_VERSIONING: TenantFeature.FILE_VERSIONING,
    FILE_ENCRYPTION: TenantFeature.FILE_ENCRYPTION,
    ADVANCED_ANALYTICS: TenantFeature.ADVANCED_ANALYTICS,
    CUSTOM_REPORTS: TenantFeature.CUSTOM_REPORTS,
    EXPORT_CAPABILITIES: TenantFeature.EXPORT_CAPABILITIES,
    API_WEBHOOKS: TenantFeature.API_WEBHOOKS,
    THIRD_PARTY_INTEGRATIONS: TenantFeature.THIRD_PARTY_INTEGRATIONS,
    CUSTOM_INTEGRATIONS: TenantFeature.CUSTOM_INTEGRATIONS,
    ADVANCED_SECURITY: TenantFeature.ADVANCED_SECURITY,
    AUDIT_LOGGING: TenantFeature.AUDIT_LOGGING,
    COMPLIANCE_REPORTING: TenantFeature.COMPLIANCE_REPORTING,
    USAGE_BASED_BILLING: TenantFeature.USAGE_BASED_BILLING,
    ADVANCED_BILLING: TenantFeature.ADVANCED_BILLING,
    INVOICE_CUSTOMIZATION: TenantFeature.INVOICE_CUSTOMIZATION,
    WEBSOCKET_FEATURES: TenantFeature.WEBSOCKET_FEATURES,
    REAL_TIME_COLLABORATION: TenantFeature.REAL_TIME_COLLABORATION,
    LIVE_CHAT: TenantFeature.LIVE_CHAT,
    ADMIN_DASHBOARD: TenantFeature.ADMIN_DASHBOARD,
    SYSTEM_MONITORING: TenantFeature.SYSTEM_MONITORING,
    BACKUP_RESTORE: TenantFeature.BACKUP_RESTORE,

    // Direct enum values
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
