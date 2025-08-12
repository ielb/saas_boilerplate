# Postman Collections for SaaS Boilerplate API

This directory contains comprehensive Postman collections for testing the SaaS Boilerplate API.

## 📁 Files Structure

```
postman/
├── collections/
│   ├── SaaS-Boilerplate-API.postman_collection.json
│   └── SaaS-Boilerplate-Tests.postman_collection.json
├── environments/
│   ├── Development.postman_environment.json
│   ├── Staging.postman_environment.json
│   └── Production.postman_environment.json
└── README.md
```

## 🚀 Quick Start

### 1. Import Collections

1. Open Postman
2. Click "Import" button
3. Import the following files:
   - `collections/SaaS-Boilerplate-API.postman_collection.json`
   - `collections/SaaS-Boilerplate-Tests.postman_collection.json`

### 2. Import Environment

1. Import `environments/Development.postman_environment.json`
2. Select the "Development" environment from the dropdown

### 3. Run Tests

1. Open the "SaaS Boilerplate Tests" collection
2. Click "Run collection" to execute all tests
3. Or run individual test folders

## 📋 Collections Overview

### SaaS-Boilerplate-API Collection

**Purpose**: Manual API testing and exploration

**Features**:

- All API endpoints organized by module
- Pre-configured request bodies with examples
- Environment variable integration
- Bearer token authentication
- Comprehensive documentation

**Modules**:

- 🔐 Authentication
- 👥 User Management
- 🏢 Tenant Management
- 🔄 Tenant Switching
- 💳 Billing & Subscriptions
- 📧 Email & Notifications
- 📁 File Management
- 🔌 WebSocket Connections
- 📊 Analytics & Reporting

### SaaS-Boilerplate-Tests Collection

**Purpose**: Automated testing and CI/CD integration

**Features**:

- Comprehensive test scripts for each endpoint
- Environment variable management
- Token rotation testing
- Error scenario coverage
- Performance testing
- Security testing

**Test Categories**:

- ✅ Authentication Tests (15 tests)
- ✅ Multi-Factor Authentication Tests (9 tests)
- ✅ Session Management Tests (12 tests)
- ✅ RBAC Permission Management Tests (5 tests)
- ✅ RBAC Role Management Tests (5 tests)
- ✅ RBAC User Role Management Tests (5 tests)
- ✅ RBAC Cleanup Tests (3 tests)
- ✅ Health Check Tests (1 test)
- ✅ Tenant Switching Tests (10 tests)
- 🔄 User Management Tests (Coming soon)
- 🏢 Tenant Management Tests (Coming soon)
- 💳 Billing Tests (Coming soon)

## 🔧 Environment Variables

### Required Variables

| Variable         | Description                 | Example                         |
| ---------------- | --------------------------- | ------------------------------- |
| `baseUrl`        | API base URL                | `http://localhost:3001/api`     |
| `accessToken`    | JWT access token            | Auto-populated after login      |
| `refreshToken`   | JWT refresh token           | Auto-populated after login      |
| `userId`         | Current user ID             | Auto-populated after login      |
| `tenantId`       | Current tenant ID           | Auto-populated after login      |
| `targetTenantId` | Target tenant for switching | Auto-populated from memberships |
| `membershipId`   | User membership ID          | Auto-populated from memberships |

### Test Variables

| Variable       | Description        | Example              |
| -------------- | ------------------ | -------------------- |
| `testEmail`    | Test user email    | `test@example.com`   |
| `testPassword` | Test user password | `SecurePassword123!` |

## 🧪 Test Scenarios

### Authentication Flow

1. **Register User** - Creates new user and tenant
2. **Login User** - Authenticates and gets tokens
3. **Get Profile** - Tests authenticated endpoint
4. **Refresh Token** - Tests token rotation
5. **Logout** - Tests token revocation

### Error Scenarios

- Invalid email format
- Weak password
- Invalid credentials
- Expired tokens
- Unauthorized access
- Missing required fields

### Security Tests

- Token validation
- Token rotation
- Token revocation
- Unauthorized access
- Invalid tokens

### RBAC Tests

- Permission creation and management
- Role creation and management
- User role assignment and removal
- Permission checking and validation
- Resource-level access control
- Permission inheritance (manage permissions)
- Custom permission conditions
- Role hierarchy and inheritance

## 🚀 Running Tests

### Manual Testing

1. **Setup Environment**:

   ```bash
   # Start the API server
   cd apps/api
   npm run start:dev
   ```

2. **Import Collections**:
   - Import both collections into Postman
   - Select "Development" environment

3. **Run Authentication Flow**:
   - Execute "Register User" request
   - Execute "Login User" request
   - Test other endpoints with generated tokens

### Automated Testing

1. **Run All Tests**:

   ```bash
   # Using Newman CLI
   newman run collections/SaaS-Boilerplate-Tests.postman_collection.json \
     -e environments/Development.postman_environment.json \
     --reporters cli,json \
     --reporter-json-export results.json
   ```

2. **Run Specific Test Folder**:
   ```bash
   newman run collections/SaaS-Boilerplate-Tests.postman_collection.json \
     -e environments/Development.postman_environment.json \
     --folder "Authentication Tests"
   ```

## 📊 Test Reports

### Newman CLI Reports

```bash
# Generate HTML report
newman run collections/SaaS-Boilerplate-Tests.postman_collection.json \
  -e environments/Development.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export reports/test-report.html
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run API Tests
  run: |
    npm install -g newman
    newman run postman/collections/SaaS-Boilerplate-Tests.postman_collection.json \
      -e postman/environments/Development.postman_environment.json \
      --reporters cli,junit \
      --reporter-junit-export test-results.xml
```

## 🔐 Security Testing

### Token Management

- **Access Token**: Short-lived (15 minutes)
- **Refresh Token**: Long-lived (7 days) with rotation
- **Token Storage**: Hashed in database
- **Token Revocation**: Immediate or bulk

### Test Scenarios

1. **Valid Token Access**: ✅ Should succeed
2. **Invalid Token Access**: ❌ Should fail (401)
3. **Expired Token Access**: ❌ Should fail (401)
4. **Token Rotation**: ✅ Should return new tokens
5. **Token Reuse**: ❌ Should fail (401)

## 📈 Performance Testing

### Response Time Tests

```javascript
pm.test('Response time is less than 200ms', function () {
  pm.expect(pm.response.responseTime).to.be.below(200);
});
```

### Load Testing

```bash
# Run with multiple iterations
newman run collections/SaaS-Boilerplate-Tests.postman_collection.json \
  -e environments/Development.postman_environment.json \
  --iteration-count 100 \
  --delay-request 100
```

## 🛠️ Customization

### Adding New Endpoints

1. **Create Request**:
   - Add to appropriate folder in collection
   - Configure headers and authentication
   - Add example request body

2. **Add Tests**:
   - Create corresponding test in test collection
   - Add validation scripts
   - Test error scenarios

3. **Update Documentation**:
   - Update this README
   - Add endpoint documentation
   - Update environment variables

### Environment Setup

1. **Development**:
   - `baseUrl`: `http://localhost:3001/api`
   - Database: Local PostgreSQL
   - Email: Mailhog

2. **Staging**:
   - `baseUrl`: `https://staging-api.example.com/api`
   - Database: Staging PostgreSQL
   - Email: SendGrid

3. **Production**:
   - `baseUrl`: `https://api.example.com/api`
   - Database: Production PostgreSQL
   - Email: Production SendGrid

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint                | Description                   |
| ------ | ----------------------- | ----------------------------- |
| POST   | `/auth/register`        | Register new user and tenant  |
| POST   | `/auth/login`           | Login with email and password |
| POST   | `/auth/refresh`         | Refresh access token          |
| POST   | `/auth/logout`          | Logout and revoke tokens      |
| GET    | `/auth/profile`         | Get user profile              |
| POST   | `/auth/verify-email`    | Verify email address          |
| POST   | `/auth/forgot-password` | Request password reset        |
| POST   | `/auth/reset-password`  | Reset password                |

### RBAC Endpoints

| Method | Endpoint                             | Description              |
| ------ | ------------------------------------ | ------------------------ |
| POST   | `/permissions`                       | Create custom permission |
| GET    | `/permissions`                       | Get all permissions      |
| GET    | `/permissions/:id`                   | Get permission by ID     |
| PUT    | `/permissions/:id`                   | Update permission        |
| DELETE | `/permissions/:id`                   | Delete permission        |
| POST   | `/roles`                             | Create custom role       |
| GET    | `/roles`                             | Get all roles            |
| GET    | `/roles/:id`                         | Get role by ID           |
| PUT    | `/roles/:id`                         | Update role              |
| DELETE | `/roles/:id`                         | Delete role              |
| POST   | `/roles/users/:id/roles`             | Assign role to user      |
| GET    | `/roles/users/:id/roles`             | Get user roles           |
| DELETE | `/roles/users/:id/roles/:roleId`     | Remove role from user    |
| GET    | `/roles/users/:id/permissions`       | Get user permissions     |
| POST   | `/roles/users/:id/permissions/check` | Check user permission    |

### Tenant Switching Endpoints

| Method | Endpoint                                              | Description                      |
| ------ | ----------------------------------------------------- | -------------------------------- |
| GET    | `/tenants/user/memberships`                           | Get user tenant memberships      |
| GET    | `/tenants/current`                                    | Get current tenant context       |
| POST   | `/tenants/switch`                                     | Switch to different tenant       |
| POST   | `/tenants/:tenantId/verify-access`                    | Verify access to specific tenant |
| POST   | `/tenants/verify-access/bulk`                         | Bulk verify access to tenants    |
| POST   | `/tenants/cache/clear`                                | Clear user tenant cache          |
| POST   | `/tenants/admin/memberships`                          | Add user to tenant (Admin)       |
| POST   | `/tenants/admin/memberships/:userId/:tenantId/remove` | Remove user from tenant (Admin)  |
| GET    | `/tenants/health`                                     | Tenant switching health check    |
| GET    | `/tenants/memberships/:membershipId`                  | Get membership details           |

### Health Check Endpoints

| Method | Endpoint  | Description       |
| ------ | --------- | ----------------- |
| GET    | `/health` | API health status |

## 🔍 Troubleshooting

### Common Issues

1. **Connection Refused**:
   - Ensure API server is running
   - Check `baseUrl` in environment
   - Verify port configuration

2. **Authentication Errors**:
   - Check token expiration
   - Verify token format
   - Ensure proper Authorization header

3. **Test Failures**:
   - Check environment variables
   - Verify test data
   - Review error messages

### Debug Mode

```bash
# Enable verbose logging
newman run collections/SaaS-Boilerplate-Tests.postman_collection.json \
  -e environments/Development.postman_environment.json \
  --verbose
```

## 📞 Support

For issues with the Postman collections:

1. Check the API server logs
2. Verify environment configuration
3. Review test scripts for syntax errors
4. Ensure all required services are running

## 🚀 Next Steps

- [x] ✅ RBAC Tests (Complete)
- [x] ✅ Tenant Switching Tests (Complete)
- [ ] Add User Management tests
- [ ] Add Tenant Management tests
- [ ] Add Billing & Subscription tests
- [ ] Add File Management tests
- [ ] Add WebSocket connection tests
- [ ] Add Performance load tests
- [ ] Add Security penetration tests
