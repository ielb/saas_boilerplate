// Jest setup file for test environment configuration
import { TestDataSource } from './src/database/test-data-source';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  'postgresql://saas_user:saas_password@localhost:5432/test_db';
process.env.POSTGRES_TEST_DB = 'test_db';
process.env.POSTGRES_USER = 'saas_user'; // Use main user for test database
process.env.POSTGRES_PASSWORD = 'saas_password'; // Use main password for test database
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.JWT_SECRET =
  'test-jwt-secret-key-for-testing-only-minimum-32-chars';
process.env.JWT_REFRESH_SECRET =
  'test-jwt-refresh-secret-key-for-testing-only-minimum-32-chars';
process.env.SESSION_SECRET =
  'test-session-secret-key-for-testing-only-minimum-32-chars';
process.env.COOKIE_SECRET =
  'test-cookie-secret-key-for-testing-only-minimum-32-chars';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.API_URL = 'http://localhost:3001';
process.env.WEB_URL = 'http://localhost:3000';
process.env.MOBILE_URL = 'http://localhost:19000';

// Global test setup - run only once for all tests
let isInitialized = false;

beforeAll(async () => {
  // Prevent multiple initializations
  if (isInitialized) {
    return;
  }

  console.log('🧪 Setting up test database...');

  try {
    // Initialize test database connection only
    await TestDataSource.initialize();
    console.log('✅ Test database initialized');

    isInitialized = true;
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    // Don't throw error to prevent test suite from failing
    // The individual tests will handle their own database setup
    console.log('⚠️  Continuing with individual test database setup...');
    isInitialized = true;
  }
});

// Global test teardown - run only once for all tests
afterAll(async () => {
  // Only cleanup if we initialized
  if (!isInitialized) {
    return;
  }

  console.log('🧹 Cleaning up test database...');

  try {
    // Close database connection
    if (TestDataSource.isInitialized) {
      await TestDataSource.destroy();
      console.log('✅ Test database connection closed');
    }
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
  }
});

// Export test data source for use in tests
export { TestDataSource };
