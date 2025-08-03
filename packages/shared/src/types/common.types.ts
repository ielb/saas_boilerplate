export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: any;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
  uploadedAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text: string;
  variables: string[];
  isActive: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  tenantId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface FeatureFlag {
  name: string;
  description: string;
  isEnabled: boolean;
  conditions?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: HealthStatus;
    redis: HealthStatus;
    email: HealthStatus;
    storage: HealthStatus;
    queue: HealthStatus;
  };
  metrics: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  lastChecked: Date;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'fifo';
}

export interface QueueJob {
  id: string;
  name: string;
  data: any;
  priority: number;
  delay?: number;
  attempts: number;
  maxAttempts: number;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  error?: string;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
  tenantId?: string;
}

export interface SearchParams {
  query: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  filters: Record<string, any>;
  suggestions?: string[];
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  fields?: string[];
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ImportOptions {
  format: 'csv' | 'xlsx' | 'json';
  mapping?: Record<string, string>;
  validation?: Record<string, any>;
  onConflict?: 'skip' | 'update' | 'error';
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraints?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface EncryptionConfig {
  algorithm: string;
  key: string;
  iv?: string;
  saltRounds?: number;
}

export interface LogConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  destination: 'console' | 'file' | 'remote';
  maxSize?: number;
  maxFiles?: number;
}

export interface MetricsConfig {
  enabled: boolean;
  interval: number;
  retention: number;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
}
