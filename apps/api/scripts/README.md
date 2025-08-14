# API Scripts

This directory contains utility scripts for the API application.

## Database Seeding Scripts

### Quick Start

To seed your database with test data, run:

```bash
cd apps/api
./scripts/seed.sh
```

Or use the npm scripts:

```bash
cd apps/api
yarn db:seed        # Run seeding only
yarn db:test-seeding # Run verification only
```

### Available Scripts

#### `seed-database.ts`

Comprehensive database seeding script that:

- Creates all permissions based on `PermissionResource` and `PermissionAction` enums
- Creates system roles with proper hierarchy
- Assigns permissions to roles
- Creates test users with different roles
- Creates tenants and user-tenant memberships

#### `test-seeding.ts`

Verification script that:

- Checks the count of permissions, roles, users, and tenants
- Verifies role-permission relationships
- Tests user authentication
- Validates data integrity

#### `seed.sh`

Shell script wrapper that:

- Checks database connectivity
- Runs the seeding script
- Runs the verification script
- Provides a summary of created data

### Test Users Created

The seeding process creates the following test users:

| Email                  | Password       | Role        | Tenant |
| ---------------------- | -------------- | ----------- | ------ |
| superadmin@example.com | SuperAdmin123! | Super Admin | System |
| admin@example.com      | Admin123!      | Admin       | Acmac  |
| manager@example.com    | Manager123!    | Manager     | Acmac  |
| member@example.com     | Member123!     | Member      | Acmac  |
| viewer@example.com     | Viewer123!     | Viewer      | Acmac  |

### Prerequisites

1. **Database Running**: Ensure PostgreSQL is running

   ```bash
   docker-compose up -d postgres
   ```

2. **Dependencies Installed**: Install API dependencies

   ```bash
   cd apps/api
   yarn install
   ```

3. **Environment Variables**: Set up database connection (optional, defaults provided)
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_USERNAME=saas_user
   export DB_PASSWORD=saas_password
   export DB_DATABASE=saas_boilerplate
   ```

### Usage Examples

#### Run Complete Seeding Process

```bash
cd apps/api
./scripts/seed.sh
```

#### Run Individual Scripts

```bash
cd apps/api

# Seed database only
yarn db:seed

# Verify seeding only
yarn db:test-seeding
```

#### Test API with Created Users

```bash
# SuperAdmin login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"SuperAdmin123!"}'

# Admin login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'
```

### What Gets Created

#### Permissions

- All combinations of `PermissionResource` × `PermissionAction`
- Proper scope assignment (GLOBAL vs TENANT)
- Unique permission names

#### Roles

- Super Admin (all permissions)
- Owner (all permissions)
- Admin (tenant permissions only)
- Manager (user/team management)
- Member (basic operations)
- Viewer (read-only access)

#### Users

- 5 test users with different roles
- Properly hashed passwords using Argon2
- Email verification completed
- Active status

#### Tenants

- **System**: System administration tenant for Super Admin
- **Acmac**: Main tenant for all other users (Admin, Manager, Member, Viewer)
- Proper configuration and settings
- Active status

#### Memberships

- User-tenant relationships
- Active membership status
- Proper role assignments

### Troubleshooting

#### Import Errors

If you encounter import errors, ensure you're running from the API directory:

```bash
cd apps/api
yarn db:seed
```

#### Database Connection Issues

Check if the database is running:

```bash
docker-compose ps postgres
```

#### Permission Denied

Make the script executable:

```bash
chmod +x apps/api/scripts/seed.sh
```

### Re-running Seeding

The scripts are idempotent - you can run them multiple times safely:

- Existing records will be skipped
- New records will be created
- Relationships will be updated

### Customization

To modify the seeding data, edit the constants in the scripts:

- `TEST_USERS` in `seed-database.ts`
- `EXPECTED_ROLES` and `EXPECTED_USERS` in `test-seeding.ts`

### Notes

- Scripts use TypeORM repositories for database operations
- Passwords are hashed using Argon2
- All created data is marked as active and verified
- Scripts include comprehensive error handling and logging
- Verification script provides detailed feedback on data integrity
