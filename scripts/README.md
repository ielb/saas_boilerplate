# Setup Scripts

This directory contains utility scripts for setting up and managing the SaaS Boilerplate platform.

## Scripts Overview

### 1. `setup-tenant.sh` ⭐ **RECOMMENDED**

Complete tenant setup with permissions, roles, and users in one unified script.

**Usage:**

```bash
./scripts/setup-tenant.sh
```

**Features:**

- **Unified setup**: Creates permissions, roles, users, and assigns everything
- **Complete automation**: No manual steps required
- **User activation**: Automatically activates users for testing
- **Role hierarchy**: Creates 5-level permission system
- **Comprehensive testing**: All test accounts ready to use
- **Error handling**: Robust error handling and validation
- **Colored output**: Easy-to-read progress indicators

**Creates:**

- **SuperAdmin (Level 1 - Owner)**: ALL permissions (full system access)
- **Admin (Level 2)**: Administrative access with full tenant management
- **Manager (Level 3)**: Team management with limited administrative access
- **User (Level 4 - Member)**: Standard user with basic access
- **Viewer (Level 5)**: Read-only access with minimal permissions

### 2. `test-api.sh`

Tests your API setup and database connectivity.

**Usage:**

```bash
./scripts/test-api.sh
```

**Features:**

- Tests API endpoints accessibility
- Tests database connection
- Shows current configuration
- Provides setup recommendations

### 3. `start-adminer.sh`

Starts Adminer (database management interface) for database management.

**Usage:**

```bash
./scripts/start-adminer.sh
```

**Features:**

- Starts Adminer on port 8080 (development)
- Provides database connection details
- Easy startup and shutdown instructions

### 4. `config.sh`

Configuration file for all scripts. Edit this file to match your local setup.

**Configuration Options:**

- API URL and port
- Database connection details
- Test user credentials
- Adminer settings

## Prerequisites

Before running any script:

1. **Start your local API:**

   ```bash
   # From the root directory
   yarn workspace @app/api start:dev

   # Or from the API directory
   cd apps/api && yarn start:dev
   ```

2. **Configure your setup:**

   ```bash
   # Edit the configuration file to match your setup
   nano scripts/config.sh
   ```

3. **Test your API setup:**
   ```bash
   ./scripts/test-api.sh
   ```

## Generated Test Accounts

After running `setup-tenant.sh`, you'll have:

- **🔴 SuperAdmin (Owner)**: `superadmin@example.com` / `SuperAdmin123!`
- **🟡 Admin**: `admin@example.com` / `Admin123!`
- **🟠 Manager**: `manager@example.com` / `Manager123!`
- **🟢 User (Member)**: `user@example.com` / `User123!`
- **🔵 Viewer**: `viewer@example.com` / `Viewer123!`

## Permission Hierarchy

```
SuperAdmin (Owner) > Admin > Manager > User (Member) > Viewer
```

### Permission Breakdown

#### SuperAdmin (Owner)

- **Access**: Full system access
- **Permissions**: ALL permissions including system_settings
- **Use Case**: System administration, global configuration

#### Admin

- **Access**: Tenant management
- **Permissions**: All except system_settings
- **Use Case**: Tenant administration, user management

#### Manager

- **Access**: Team and content management
- **Permissions**: User management (read/create/update), team management, file management, notifications, reports
- **Use Case**: Team leadership, project management

#### User (Member)

- **Access**: Basic operations
- **Permissions**: File operations (create/read/update), notifications, user read
- **Use Case**: Regular user activities

#### Viewer

- **Access**: Read-only access
- **Permissions**: Read access to users, files, notifications
- **Use Case**: Observers, auditors, read-only users

## Quick Start

1. **Test your setup:**

   ```bash
   ./scripts/test-api.sh
   ```

2. **Setup complete tenant:**

   ```bash
   ./scripts/setup-tenant.sh
   ```

3. **Start Adminer (optional):**
   ```bash
   ./scripts/start-adminer.sh
   ```

## Testing Different Permission Levels

1. **Login with different accounts** to test access control
2. **Try accessing protected endpoints** to verify permissions
3. **Use Postman collections** to test API endpoints
4. **Check Adminer** to view database structure and data

## Troubleshooting

### Common Issues

1. **API not running:**

   ```bash
   docker-compose up -d
   ```

2. **Permission denied:**

   ```bash
   chmod +x scripts/*.sh
   ```

3. **Database connection issues:**
   - Check if PostgreSQL is running
   - Verify database credentials
   - Check Adminer at http://localhost:8080

4. **Script fails:**
   - Check API health: `curl http://localhost:3001/api/health`
   - Verify all services are running: `docker-compose ps`
   - Check logs: `docker-compose logs api`

### Error Messages

- **"API is not running"**: Start the API with `docker-compose up -d`
- **"Failed to register user"**: Check if user already exists or API is healthy
- **"Failed to create role"**: Verify permissions and API status
- **"Failed to assign role"**: Check user and role IDs

## Security Notes

⚠️ **Important Security Considerations:**

1. **Change default passwords** in production
2. **Use strong passwords** for all accounts
3. **Limit access** to production databases
4. **Regular security audits** of user permissions
5. **Monitor access logs** for suspicious activity

## Production Usage

For production environments:

1. **Modify scripts** to use environment variables
2. **Use secure passwords** instead of defaults
3. **Limit Adminer access** to authorized personnel only
4. **Regular backup** of user and role data
5. **Audit trail** for all permission changes

## Support

For issues or questions:

- Check the main [README.md](../README.md)
- Review API documentation at http://localhost:3001/api/docs
- Check Docker logs: `docker-compose logs`
- Verify service health: `docker-compose ps`
