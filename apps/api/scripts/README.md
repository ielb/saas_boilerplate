# Database Management Scripts

This directory contains scripts for managing the database in development and testing environments.

## 📋 Available Commands

### Database Reset Commands

```bash
# Reset main database (development/production)
npm run db:reset

# Reset test database
npm run db:reset:test

# Create main database
npm run db:create

# Create test database
npm run db:create:test

# Drop main database
npm run db:drop

# Drop test database
npm run db:drop:test
```

### Migration Commands

```bash
# Run migrations on main database
npm run db:migrate

# Run migrations on test database
npm run db:migrate:test
```

### Test Setup Commands

```bash
# Setup test environment (create + reset test database)
npm run test:setup

# Cleanup test environment (drop test database)
npm run test:cleanup
```

## 🗄️ Database Configuration

### Main Database

- **Database**: `saas_boilerplate`
- **User**: `saas_user`
- **Password**: `saas_password`
- **Host**: `localhost`
- **Port**: `5432`

### Test Database

- **Database**: `test_db`
- **User**: `saas_user` (same as main database)
- **Password**: `saas_password` (same as main database)
- **Host**: `localhost`
- **Port**: `5432`

## 🧪 Test Database Setup

The test database is automatically configured when running tests:

1. **Jest Setup**: `jest.setup.ts` automatically initializes the test database
2. **Test Isolation**: Each test run gets a fresh database schema
3. **Data Cleanup**: All data is cleared between test runs
4. **Transaction Support**: Tests can use transactions for data isolation

### Test Database Features

- ✅ **Automatic Setup**: Database is created and migrated automatically
- ✅ **Data Isolation**: Each test gets a clean database state
- ✅ **Transaction Support**: Tests can use database transactions
- ✅ **Test Utilities**: Helper functions for creating test data
- ✅ **Automatic Cleanup**: Database is cleaned up after tests

## 🔧 Environment Variables

### Required for Main Database

```bash
DATABASE_URL=postgresql://saas_user:saas_password@localhost:5432/saas_boilerplate
POSTGRES_DB=saas_boilerplate
POSTGRES_USER=saas_user
POSTGRES_PASSWORD=saas_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

### Required for Test Database

```bash
POSTGRES_TEST_DB=test_db
```

## 📝 Usage Examples

### Development Workflow

```bash
# 1. Start fresh development database
npm run db:drop
npm run db:create
npm run db:reset

# 2. Run development server
npm run start:dev
```

### Testing Workflow

```bash
# 1. Setup test environment
npm run test:setup

# 2. Run tests
npm run test

# 3. Cleanup (optional)
npm run test:cleanup
```

### Database Reset Workflow

```bash
# Reset main database (drops all data and runs migrations)
npm run db:reset

# Reset test database
npm run db:reset:test
```

## 🛠️ Manual Database Operations

### Using psql

```bash
# Connect to main database
psql -h localhost -U saas_user -d saas_boilerplate

# Connect to test database
psql -h localhost -U test_user -d test_db
```

### Using createdb/dropdb

```bash
# Create databases
createdb -h localhost -U saas_user saas_boilerplate
createdb -h localhost -U test_user test_db

# Drop databases
dropdb -h localhost -U saas_user saas_boilerplate
dropdb -h localhost -U test_user test_db
```

## 🔍 Troubleshooting

### Common Issues

1. **Connection Refused**

   ```bash
   # Check if PostgreSQL is running
   brew services list | grep postgresql
   # or
   sudo systemctl status postgresql
   ```

2. **Permission Denied**

   ```bash
   # Create user if it doesn't exist
   createuser -h localhost -U postgres saas_user
   createuser -h localhost -U postgres test_user
   ```

3. **Database Doesn't Exist**

   ```bash
   # Create databases
   npm run db:create
   npm run db:create:test
   ```

4. **Migration Errors**
   ```bash
   # Reset and run migrations
   npm run db:reset
   npm run db:reset:test
   ```

### Debug Mode

```bash
# Run reset with verbose logging
DEBUG=* npm run db:reset

# Run tests with database logging
npm run test -- --verbose
```

## 📚 Additional Resources

- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Jest Testing Framework](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
