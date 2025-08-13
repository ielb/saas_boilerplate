import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export const testDatabaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'test_user',
  password: process.env.POSTGRES_PASSWORD || 'test_password',
  database: process.env.POSTGRES_TEST_DB || 'test_db',
  entities: [join(__dirname, '../../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../../database/migrations/*{.ts,.js}')],
  synchronize: true, // Enable synchronize for tests
  logging: false, // Disable logging for tests
  dropSchema: true, // Drop schema before each test run
  ssl: false,
  extra: {
    connectionLimit: 5,
    acquireTimeout: 30000,
    timeout: 15000,
  },
};
