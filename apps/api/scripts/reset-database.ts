#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { join } from 'path';
import { env } from '@app/config';

/**
 * Database Reset Script
 *
 * This script resets the database by:
 * 1. Dropping all tables (if they exist)
 * 2. Running all migrations
 * 3. Optionally seeding with initial data
 */

const createDatabaseIfNotExists = async (
  databaseName: string,
  username: string,
  password: string
) => {
  console.log(`🔍 Checking if database '${databaseName}' exists...`);

  // Try to connect to postgres database to create our target database
  const postgresDataSource = new DataSource({
    type: 'postgres',
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: 'postgres', // Connect to default postgres database
    synchronize: false,
    logging: false,
    ssl: false,
  });

  try {
    await postgresDataSource.initialize();

    // Check if database exists
    const result = await postgresDataSource.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );

    if (result.length === 0) {
      console.log(`📦 Creating database '${databaseName}'...`);
      await postgresDataSource.query(`CREATE DATABASE ${databaseName}`);
      console.log(`✅ Database '${databaseName}' created successfully`);
    } else {
      console.log(`✅ Database '${databaseName}' already exists`);
    }
  } catch (error) {
    console.error(`❌ Failed to create database '${databaseName}':`, error);
    throw error;
  } finally {
    if (postgresDataSource.isInitialized) {
      await postgresDataSource.destroy();
    }
  }
};

const resetDatabase = async () => {
  console.log('🔄 Starting database reset...');

  // Create database if it doesn't exist
  await createDatabaseIfNotExists(
    env.POSTGRES_DB,
    env.POSTGRES_USER,
    env.POSTGRES_PASSWORD
  );

  // Create data source for reset operations
  const dataSource = new DataSource({
    type: 'postgres',
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    entities: [join(__dirname, '../src/**/*.entity{.ts,.js}')],
    migrations: [join(__dirname, '../src/database/migrations/*{.ts,.js}')],
    synchronize: env.NODE_ENV === 'development', // Use synchronize for development
    logging: false,
    dropSchema: true, // Drop schema before each reset
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Initialize data source
    await dataSource.initialize();
    console.log('✅ Database connection established');

    if (env.NODE_ENV === 'development') {
      // Use synchronize for development
      console.log('🗑️  Dropping and recreating schema...');
      await dataSource.synchronize(true);
      console.log('✅ Schema synchronized');
    } else {
      // Use migrations for production
      console.log('🗑️  Dropping all tables...');
      await dataSource.dropDatabase();
      console.log('✅ All tables dropped');

      console.log('📦 Running migrations...');
      await dataSource.runMigrations();
      console.log('✅ Migrations completed');
    }

    console.log('🎉 Database reset completed successfully!');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
};

const resetTestDatabase = async () => {
  console.log('🧪 Starting test database reset...');

  const testDbName = process.env.POSTGRES_TEST_DB || 'test_db';

  // Create test database if it doesn't exist
  await createDatabaseIfNotExists(
    testDbName,
    env.POSTGRES_USER,
    env.POSTGRES_PASSWORD
  );

  // Create data source for test database
  const testDataSource = new DataSource({
    type: 'postgres',
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    username: env.POSTGRES_USER, // Use main user
    password: env.POSTGRES_PASSWORD, // Use main password
    database: testDbName,
    entities: [join(__dirname, '../src/**/*.entity{.ts,.js}')],
    migrations: [join(__dirname, '../src/database/migrations/*{.ts,.js}')],
    synchronize: true, // Use synchronize for test database to avoid migration dependency issues
    logging: false,
    dropSchema: true, // Drop schema before each test run
    ssl: false,
  });

  try {
    // Initialize data source
    await testDataSource.initialize();
    console.log('✅ Test database connection established');

    // Drop and recreate schema (synchronize will handle this)
    console.log('🗑️  Dropping and recreating test schema...');
    await testDataSource.synchronize(true);
    console.log('✅ Test schema synchronized');

    console.log('🎉 Test database reset completed successfully!');
  } catch (error) {
    console.error('❌ Test database reset failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
      console.log('🔌 Test database connection closed');
    }
  }
};

// Main execution
const main = async () => {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test') || args.includes('-t');

  if (isTest) {
    await resetTestDatabase();
  } else {
    await resetDatabase();
  }
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

export { resetDatabase, resetTestDatabase };
