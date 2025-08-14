# Scripts Directory

This directory contains utility scripts for managing the SaaS Boilerplate project.

## 🌱 Database Seeding

Database seeding scripts have been moved to the API folder for better organization and to resolve import path issues.

### Quick Start

```bash
# Run the comprehensive database seeding script
cd apps/api && ./scripts/seed.sh
```

This will create:

- ✅ All permissions based on PermissionResource and PermissionAction enums
- ✅ All system roles with proper hierarchy
- ✅ Role-permission relationships
- ✅ Test users with different roles
- ✅ Two tenants: System (Super Admin) and Acmac (all other users)
- ✅ User-tenant memberships

### Test Users Created

| Email                    | Password         | Role        | Tenant | Description           |
| ------------------------ | ---------------- | ----------- | ------ | --------------------- |
| `superadmin@example.com` | `SuperAdmin123!` | Super Admin | System | Full system access    |
| `admin@example.com`      | `Admin123!`      | Admin       | Acmac  | Administrative access |
| `manager@example.com`    | `Manager123!`    | Manager     | Acmac  | Team management       |
| `member@example.com`     | `Member123!`     | Member      | Acmac  | Basic operations      |
| `viewer@example.com`     | `Viewer123!`     | Viewer      | Acmac  | Read-only access      |

### Testing the Seeding

```bash
# Test that seeding worked correctly
cd apps/api && yarn db:test-seeding

# Test login with created users
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"SuperAdmin123!"}'
```

For detailed information about the seeding process, see [apps/api/scripts/README.md](./apps/api/scripts/README.md).

## 🐳 Docker Service Management

### Quick Commands

```bash
# Start only PostgreSQL database
docker-compose up -d postgres

# Start only Redis cache
docker-compose up -d redis

# Start only the API (with dependencies)
docker-compose up -d api

# Start only Adminer for database management
docker-compose up -d adminer

# Start only Mailhog for email testing
docker-compose up -d mailhog

# Start only MinIO for file storage
docker-compose up -d minio
```

### Using the Docker Services Script

We've created a convenient script to manage individual services:

```bash
# Show help
./scripts/docker-services.sh

# Start a service in background
./scripts/docker-services.sh postgres start

# Check service status
./scripts/docker-services.sh redis status

# View service logs
./scripts/docker-services.sh api logs

# Start service in foreground
./scripts/docker-services.sh adminer up

# Stop a service
./scripts/docker-services.sh minio stop

# Restart a service
./scripts/docker-services.sh postgres restart
```

### Available Services

| Service    | Port      | Description                |
| ---------- | --------- | -------------------------- |
| `postgres` | 5432      | PostgreSQL Database        |
| `redis`    | 6379      | Redis Cache                |
| `api`      | 3001      | NestJS API Backend         |
| `adminer`  | 8081      | Database Management UI     |
| `mailhog`  | 1025/8025 | Email Testing              |
| `minio`    | 9000/9001 | S3-Compatible File Storage |

### Common Use Cases

#### Database Work Only

```bash
# Start just the database
docker-compose up -d postgres

# Access via Adminer
docker-compose up -d adminer
# Then visit: http://localhost:8081
```

#### API Development

```bash
# Start database dependencies
docker-compose up -d postgres redis

# Run API locally (not in Docker)
cd apps/api && npm run start:dev
```

#### Full Stack Development

```bash
# Start all services
docker-compose up -d

# Or start specific services
docker-compose up -d postgres redis mailhog minio adminer
```

### Service Dependencies

- **API** depends on `postgres` and `redis`
- **Adminer** depends on `postgres`
- Other services are independent

### Useful Commands

```bash
# View all running services
docker-compose ps

# View logs of all services
docker-compose logs

# View logs of specific service
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f api

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild a service
docker-compose up --build api
```

## 🔐 Super Admin Permissions

### Complete Setup (Recommended)

```bash
# One-command setup for Super Admin with full permissions
./scripts/setup-super-admin.sh
```

This script handles:

- ✅ Creates/updates Super Admin role
- ✅ Updates Owner role with all permissions
- ✅ Assigns user to both roles
- ✅ Verifies all permissions (132+ total)
- ✅ Tests the setup automatically

### Manual SQL Management

```bash
# Comprehensive SQL script for all Super Admin operations
docker exec -i saas-postgres psql -U saas_user -d saas_boilerplate < scripts/super-admin-permissions-manager.sql
```

### Testing Super Admin Permissions

```bash
# Test Super Admin login and permissions
./scripts/test-super-admin-permissions.sh
```

### Alternative Manual Execution

```bash
# Execute SQL directly if needed
docker exec -i saas-postgres psql -U saas_user -d saas_boilerplate < scripts/super-admin-permissions-manager.sql
```

## 📧 Email Testing

### Start Mailhog

```bash
docker-compose up -d mailhog
```

### Access Email Interface

- **SMTP**: localhost:1025
- **Web UI**: http://localhost:8025

## 📁 File Storage

### Start MinIO

```bash
docker-compose up -d minio
```

### Access MinIO

- **API**: localhost:9000
- **Console**: http://localhost:9001
- **Credentials**: minioadmin / minioadmin123

## 🗄️ Database Management

### Start Adminer

```bash
docker-compose up -d adminer
```

### Access Adminer

- **URL**: http://localhost:8081
- **Server**: postgres
- **Username**: saas_user
- **Password**: saas_password
- **Database**: saas_boilerplate

## 🧪 Testing

### Run API Tests

```bash
cd apps/api && npm test
```

### Run Postman Tests

```bash
# Make sure API is running first
./scripts/test-api.sh
```

## 🔧 Configuration

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
./scripts/config.sh
```

### Database Setup

```bash
# Run migrations
cd apps/api && npm run migration:run

# Seed database
cd apps/api && npm run seed
```
