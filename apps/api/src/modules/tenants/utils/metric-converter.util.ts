import { TenantUsageMetric } from '../entities/tenant-usage.entity';

/**
 * Convert camelCase metric names to snake_case enum values
 */
export function convertMetricToEnum(metric: string): TenantUsageMetric | null {
  const metricMap: Record<string, TenantUsageMetric> = {
    // CamelCase to snake_case mapping
    apiCalls: TenantUsageMetric.API_CALLS,
    storageBytes: TenantUsageMetric.STORAGE_BYTES,
    emailsSent: TenantUsageMetric.EMAILS_SENT,
    filesUploaded: TenantUsageMetric.FILES_UPLOADED,
    databaseQueries: TenantUsageMetric.DATABASE_QUERIES,
    websocketConnections: TenantUsageMetric.WEBSOCKET_CONNECTIONS,
    backgroundJobs: TenantUsageMetric.BACKGROUND_JOBS,

    // Direct enum values
    api_calls: TenantUsageMetric.API_CALLS,
    storage_bytes: TenantUsageMetric.STORAGE_BYTES,
    users: TenantUsageMetric.USERS,
    emails_sent: TenantUsageMetric.EMAILS_SENT,
    files_uploaded: TenantUsageMetric.FILES_UPLOADED,
    database_queries: TenantUsageMetric.DATABASE_QUERIES,
    websocket_connections: TenantUsageMetric.WEBSOCKET_CONNECTIONS,
    background_jobs: TenantUsageMetric.BACKGROUND_JOBS,
  };

  return metricMap[metric] || null;
}

/**
 * Get all valid metric values for error messages
 */
export function getValidMetrics(): string[] {
  return Object.values(TenantUsageMetric);
}

/**
 * Validate if a metric string is valid
 */
export function isValidMetric(metric: string): boolean {
  return convertMetricToEnum(metric) !== null;
}
