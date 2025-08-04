// Jest setup file for test environment configuration
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  'postgresql://test_user:test_password@localhost:5432/test_db';
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
