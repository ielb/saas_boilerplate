import { TestDataSource } from '../database/test-data-source';
import { DataSource, Repository, ObjectLiteral } from 'typeorm';

/**
 * Test Database Utilities
 *
 * Provides utilities for managing test database operations
 */

export class TestDatabaseUtils {
  private static dataSource: DataSource;

  /**
   * Initialize test database connection
   */
  static async initialize(): Promise<void> {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      this.dataSource = TestDataSource;
      await this.dataSource.initialize();
    }
  }

  /**
   * Get repository for an entity
   */
  static getRepository<T extends ObjectLiteral>(
    entity: new () => T
  ): Repository<T> {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error(
        'Test database not initialized. Call initialize() first.'
      );
    }
    return this.dataSource.getRepository(entity);
  }

  /**
   * Clear all data from all tables
   */
  static async clearAllData(): Promise<void> {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error(
        'Test database not initialized. Call initialize() first.'
      );
    }

    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.clear();
    }
  }

  /**
   * Reset database (drop and recreate)
   */
  static async resetDatabase(): Promise<void> {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error(
        'Test database not initialized. Call initialize() first.'
      );
    }

    // Drop all tables
    await this.dataSource.dropDatabase();

    // Run migrations
    await this.dataSource.runMigrations();
  }

  /**
   * Close database connection
   */
  static async close(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  /**
   * Get database connection status
   */
  static isInitialized(): boolean {
    return this.dataSource?.isInitialized || false;
  }

  /**
   * Get the data source instance
   */
  static getDataSource(): DataSource {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error(
        'Test database not initialized. Call initialize() first.'
      );
    }
    return this.dataSource;
  }
}

/**
 * Test transaction wrapper
 * Executes a function within a database transaction and rolls back after completion
 */
export const withTestTransaction = async <T>(
  fn: () => Promise<T>
): Promise<T> => {
  const queryRunner = TestDatabaseUtils.getDataSource().createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await fn();
    await queryRunner.rollbackTransaction();
    return result;
  } finally {
    await queryRunner.release();
  }
};

/**
 * Create test data factory
 */
export const createTestData = {
  /**
   * Create a test user
   */
  user: (overrides: Partial<any> = {}) => ({
    email: `test-${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    password: 'TestPassword123!',
    isEmailVerified: true,
    ...overrides,
  }),

  /**
   * Create a test tenant
   */
  tenant: (overrides: Partial<any> = {}) => ({
    name: `Test Tenant ${Date.now()}`,
    domain: `test-${Date.now()}.example.com`,
    settings: {},
    ...overrides,
  }),

  /**
   * Create test branding configuration
   */
  branding: (overrides: Partial<any> = {}) => ({
    theme: 'light',
    colorScheme: {
      primary: '#3B82F6',
      secondary: '#6B7280',
      accent: '#10B981',
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
    },
    ...overrides,
  }),
};
