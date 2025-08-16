import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Readable } from 'stream';
import {
  StorageProvider,
  StorageProviderConfig,
  StorageHealthStatus,
  StorageOperationResult,
  StorageProviderStrategy,
  FileMetadata,
  UploadOptions,
  DownloadOptions,
} from './storage-provider.interface';
import { StorageProviderFactory } from './storage-provider.factory';

/**
 * Storage manager configuration
 */
export interface StorageManagerConfig {
  providers: StorageProviderConfig[];
  strategy: StorageProviderStrategy;
  healthCheckInterval?: number; // in milliseconds
  failoverTimeout?: number; // in milliseconds
}

/**
 * Storage manager service for handling multiple storage providers
 */
@Injectable()
export class StorageManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StorageManagerService.name);
  private providers: Map<string, StorageProvider> = new Map();
  private healthStatus: Map<string, StorageHealthStatus> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private currentProviderIndex = 0;
  private config: StorageManagerConfig;

  constructor(
    private readonly factory: StorageProviderFactory,
    config: StorageManagerConfig
  ) {
    this.config = config;
  }

  /**
   * Initialize storage providers on module init
   */
  async onModuleInit(): Promise<void> {
    await this.initializeProviders();
    this.startHealthChecks();
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    this.stopHealthChecks();
    await this.cleanupProviders();
  }

  /**
   * Upload a file using the selected strategy
   */
  async upload(
    key: string,
    data: Buffer | Readable,
    options?: UploadOptions
  ): Promise<FileMetadata> {
    this.logger.log(`StorageManager: Uploading file with key: ${key}`);
    const provider = await this.selectProvider('upload');
    return this.executeWithRetry(
      () => provider.upload(key, data, options),
      'upload',
      key
    );
  }

  /**
   * Download a file using the selected strategy
   */
  async download(key: string, options?: DownloadOptions): Promise<Buffer> {
    const provider = await this.selectProvider('download');
    return this.executeWithRetry(
      () => provider.download(key, options),
      'download',
      key
    );
  }

  /**
   * Get a readable stream for a file
   */
  async getStream(key: string): Promise<Readable> {
    const provider = await this.selectProvider('getStream');
    return this.executeWithRetry(
      () => provider.getStream(key),
      'getStream',
      key
    );
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<FileMetadata> {
    const provider = await this.selectProvider('getMetadata');
    return this.executeWithRetry(
      () => provider.getMetadata(key),
      'getMetadata',
      key
    );
  }

  /**
   * Delete a file
   */
  async delete(key: string): Promise<void> {
    const provider = await this.selectProvider('delete');
    return this.executeWithRetry(() => provider.delete(key), 'delete', key);
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    const provider = await this.selectProvider('exists');
    return this.executeWithRetry(() => provider.exists(key), 'exists', key);
  }

  /**
   * Generate a signed URL for file access
   */
  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    const provider = await this.selectProvider('getSignedUrl');
    return this.executeWithRetry(
      () => provider.getSignedUrl(key, expiresIn),
      'getSignedUrl',
      key
    );
  }

  /**
   * Get a public URL for a file
   */
  async getPublicUrl(key: string): Promise<string> {
    const provider = await this.selectProvider('getPublicUrl');
    return this.executeWithRetry(
      () => provider.getPublicUrl(key),
      'getPublicUrl',
      key
    );
  }

  /**
   * Copy a file
   */
  async copy(sourceKey: string, destinationKey: string): Promise<FileMetadata> {
    const provider = await this.selectProvider('copy');
    return this.executeWithRetry(
      () => provider.copy(sourceKey, destinationKey),
      'copy',
      `${sourceKey} -> ${destinationKey}`
    );
  }

  /**
   * Move a file
   */
  async move(sourceKey: string, destinationKey: string): Promise<FileMetadata> {
    const provider = await this.selectProvider('move');
    return this.executeWithRetry(
      () => provider.move(sourceKey, destinationKey),
      'move',
      `${sourceKey} -> ${destinationKey}`
    );
  }

  /**
   * List files
   */
  async list(prefix?: string, maxKeys?: number): Promise<FileMetadata[]> {
    const provider = await this.selectProvider('list');
    return this.executeWithRetry(
      () => provider.list(prefix, maxKeys),
      'list',
      prefix || 'root'
    );
  }

  /**
   * Get health status of all providers
   */
  getHealthStatus(): StorageHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): StorageProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Initialize all storage providers
   */
  private async initializeProviders(): Promise<void> {
    for (const config of this.config.providers) {
      if (!config.enabled) {
        continue;
      }

      try {
        if (!this.factory.validateConfig(config)) {
          this.logger.error(
            `Invalid configuration for provider: ${config.provider}`
          );
          continue;
        }

        const provider = this.factory.createProvider(config);
        await provider.initialize();

        this.providers.set(config.provider, provider);
        this.logger.log(`Storage provider initialized: ${config.provider}`);
      } catch (error) {
        this.logger.error(
          `Failed to initialize provider: ${config.provider}`,
          error
        );
      }
    }

    if (this.providers.size === 0) {
      throw new Error('No storage providers could be initialized');
    }
  }

  /**
   * Select provider based on strategy
   */
  private async selectProvider(operation: string): Promise<StorageProvider> {
    const availableProviders = Array.from(this.providers.values()).filter(
      provider => this.isProviderHealthy(provider.name)
    );

    if (availableProviders.length === 0) {
      throw new Error('No healthy storage providers available');
    }

    switch (this.config.strategy) {
      case StorageProviderStrategy.PRIMARY:
        return availableProviders[0]!;

      case StorageProviderStrategy.FAILOVER:
        return availableProviders[0]!;

      case StorageProviderStrategy.LOAD_BALANCE:
        // Simple round-robin for load balancing
        const index = this.currentProviderIndex % availableProviders.length;
        this.currentProviderIndex =
          (this.currentProviderIndex + 1) % availableProviders.length;
        return availableProviders[index]!;

      case StorageProviderStrategy.ROUND_ROBIN:
        const roundRobinIndex =
          this.currentProviderIndex % availableProviders.length;
        this.currentProviderIndex =
          (this.currentProviderIndex + 1) % availableProviders.length;
        return availableProviders[roundRobinIndex]!;

      default:
        return availableProviders[0]!;
    }
  }

  /**
   * Execute operation with retry and failover
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    key: string
  ): Promise<T> {
    const providers = Array.from(this.providers.values());
    const maxRetries = Math.min(providers.length, 3);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const provider = await this.selectProvider(operationName);

      try {
        const result = await operation.call(provider);
        this.logger.log(
          `Operation ${operationName} succeeded on provider ${provider.name}: ${key}`
        );
        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Operation ${operationName} failed on provider ${provider.name} (attempt ${attempt + 1}): ${key}`,
          error
        );

        // Mark provider as unhealthy temporarily
        this.markProviderUnhealthy(provider.name, (error as Error).message);

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw new Error(
      `All storage providers failed for operation ${operationName}: ${lastError?.message}`
    );
  }

  /**
   * Check if provider is healthy
   */
  private isProviderHealthy(providerName: string): boolean {
    const status = this.healthStatus.get(providerName);
    return status?.status === 'healthy';
  }

  /**
   * Mark provider as unhealthy
   */
  private markProviderUnhealthy(providerName: string, error: string): void {
    const status: StorageHealthStatus = {
      provider: providerName,
      status: 'unhealthy',
      responseTime: 0,
      lastChecked: new Date(),
      error,
    };
    this.healthStatus.set(providerName, status);
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    const interval = this.config.healthCheckInterval || 30000; // 30 seconds default

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, interval);

    this.logger.log(`Health checks started with interval: ${interval}ms`);
  }

  /**
   * Stop health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.logger.log('Health checks stopped');
    }
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    const healthChecks = Array.from(this.providers.values()).map(
      async provider => {
        try {
          const status = await provider.getHealthStatus();
          this.healthStatus.set(provider.name, status);
        } catch (error) {
          this.logger.error(
            `Health check failed for provider: ${provider.name}`,
            error
          );
          this.markProviderUnhealthy(provider.name, (error as Error).message);
        }
      }
    );

    await Promise.all(healthChecks);
  }

  /**
   * Cleanup all providers
   */
  private async cleanupProviders(): Promise<void> {
    const cleanupPromises = Array.from(this.providers.values()).map(
      async provider => {
        try {
          await provider.cleanup();
          this.logger.log(`Provider cleaned up: ${provider.name}`);
        } catch (error) {
          this.logger.error(
            `Failed to cleanup provider: ${provider.name}`,
            error
          );
        }
      }
    );

    await Promise.all(cleanupPromises);
    this.providers.clear();
    this.healthStatus.clear();
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
