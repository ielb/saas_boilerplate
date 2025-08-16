# Postman Collections for SaaS Boilerplate API

This directory contains comprehensive Postman collections for testing the SaaS Boilerplate API, including the newly refactored Tenant Branding Service with SOLID principles and the complete User Lifecycle Management system.

## 📁 Collections Overview

### 1. **SaaS-Boilerplate-API.postman_collection.json**

Complete API collection covering all endpoints including:

- Authentication & Authorization
- User Management
- **User Lifecycle Management** (NEW - Complete lifecycle operations)
- **File Storage Management** (NEW - Complete file operations)
- Tenant Management
- Tenant Switching
- **Tenant Branding** (ENHANCED - SOLID refactored)
- Health Checks

### 2. **Tenant-Branding-API.postman_collection.json**

Dedicated collection for Tenant Branding features with comprehensive testing:

- Core Branding Operations
- Validation Operations
- Preview Operations
- Export/Import Operations
- Template Operations
- Health & Monitoring
- Error Scenarios
- Accessibility Testing
- Performance Testing

## 🚀 Quick Start

### 1. Import Collections

1. Open Postman
2. Click "Import" button
3. Select the collection files from this directory
4. Import both collections

### 2. Set Up Environment

1. Create a new environment in Postman
2. Add the following variables:

```json
{
  "baseUrl": "http://localhost:3001/api",
  "accessToken": "",
  "refreshToken": "",
  "userId": "",
  "tenantId": "",
  "adminToken": "",
  "brandingId": "",
  "exportId": "",
  "fileKey": "",
  "fileUrl": "",
  "signedUrl": "",
  "copiedFileKey": "",
  "movedFileKey": ""
}
```

### 3. Authentication Setup

1. Run the "Login" request from the Authentication folder
2. Copy the `accessToken` from the response
3. Set the `accessToken` environment variable
4. For admin operations, use the `adminToken` variable

## 👤 User Lifecycle Management API Features

### **Core Operations**

#### **Register New User**

```http
POST {{baseUrl}}/users
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "tenantId": "{{tenantId}}",
  "role": "member",
  "sendEmailVerification": true,
  "sendWelcomeEmail": true
}
```

**Response:**

```json
{
  "id": "user-123",
  "email": "newuser@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "role": "member",
  "status": "pending",
  "tenantId": "{{tenantId}}",
  "emailVerified": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### **Activate User**

```http
PUT {{baseUrl}}/users/{{newUserId}}/activate
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "skipEmailVerification": false,
  "auditEvent": "user.activated_by_admin"
}
```

**Response:**

```json
{
  "id": "user-123",
  "email": "newuser@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "role": "member",
  "status": "active",
  "tenantId": "{{tenantId}}",
  "emailVerified": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

#### **Suspend User**

```http
PUT {{baseUrl}}/users/{{userId}}/suspend
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "reason": "Violation of terms of service",
  "duration": 30,
  "auditEvent": "user.suspended_by_admin"
}
```

**Response:**

```json
{
  "id": "user-123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "role": "member",
  "status": "suspended",
  "tenantId": "{{tenantId}}",
  "emailVerified": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:40:00.000Z"
}
```

#### **Reactivate User**

```http
PUT {{baseUrl}}/users/{{userId}}/reactivate
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "auditEvent": "user.reactivated_by_admin"
}
```

**Response:**

```json
{
  "id": "user-123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "role": "member",
  "status": "active",
  "tenantId": "{{tenantId}}",
  "emailVerified": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:45:00.000Z"
}
```

#### **Get User Lifecycle Information**

```http
GET {{baseUrl}}/users/{{userId}}/lifecycle
Authorization: Bearer {{accessToken}}
```

**Response:**

```json
{
  "id": "user-123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "role": "member",
  "status": "suspended",
  "tenantId": "{{tenantId}}",
  "emailVerified": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:40:00.000Z",
  "isActive": false,
  "isSuspended": true,
  "isDeleted": false,
  "suspensionInfo": {
    "suspendedAt": "2024-01-15T10:40:00.000Z",
    "reason": "Violation of terms of service",
    "expiresAt": "2024-02-14T10:40:00.000Z",
    "isExpired": false
  }
}
```

#### **Delete User**

```http
DELETE {{baseUrl}}/users/{{userId}}
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "auditEvent": "user.deleted_by_admin"
}
```

**Response:**

```http
204 No Content
```

### **Bulk Operations**

#### **Bulk Activate Users**

```http
POST {{baseUrl}}/users/bulk/activate
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "userIds": ["user-123", "user-456"],
  "auditEvent": "users.bulk_activated_by_admin"
}
```

**Response:**

```json
{
  "successCount": 2,
  "failureCount": 0,
  "successfulUserIds": ["user-123", "user-456"],
  "errors": []
}
```

#### **Bulk Suspend Users**

```http
POST {{baseUrl}}/users/bulk/suspend
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "userIds": ["user-123", "user-456"],
  "auditEvent": "users.bulk_suspended_by_admin"
}
```

**Response:**

```json
{
  "successCount": 1,
  "failureCount": 1,
  "successfulUserIds": ["user-123"],
  "errors": [
    {
      "userId": "user-456",
      "error": "Cannot suspend tenant owner"
    }
  ]
}
```

### **Error Scenarios**

#### **Duplicate Email Registration**

```http
POST {{baseUrl}}/users
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "email": "existinguser@example.com",
  "password": "SecurePassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "tenantId": "{{tenantId}}",
  "role": "member"
}
```

**Response:**

```json
{
  "statusCode": 400,
  "message": "User already exists with this email",
  "error": "Bad Request"
}
```

#### **Activate Already Active User**

```http
PUT {{baseUrl}}/users/{{userId}}/activate
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "skipEmailVerification": false
}
```

**Response:**

```json
{
  "statusCode": 400,
  "message": "User is already active",
  "error": "Bad Request"
}
```

#### **Suspend Tenant Owner**

```http
PUT {{baseUrl}}/users/{{ownerUserId}}/suspend
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "reason": "Test suspension"
}
```

**Response:**

```json
{
  "statusCode": 400,
  "message": "Cannot suspend tenant owner",
  "error": "Bad Request"
}
```

## 📁 File Storage Management API Features

### **Core Operations**

#### **Upload File**

```http
POST {{baseUrl}}/files/upload
Authorization: Bearer {{accessToken}}
Content-Type: multipart/form-data

Form Data:
- file: [Select file]
- key: uploads/{{$timestamp}}/{{$randomUUID}}
- metadata: {"category":"document","uploadedBy":"{{userId}}"}
```

**Response:**

```json
{
  "key": "uploads/1705123456789/abc123-def456-ghi789.txt",
  "size": 1024,
  "mimeType": "text/plain",
  "lastModified": "2024-01-15T10:30:00.000Z",
  "url": "http://localhost:3001/api/files/uploads/1705123456789/abc123-def456-ghi789.txt",
  "etag": "abc123def456ghi789",
  "metadata": {
    "category": "document",
    "uploadedBy": "user-123"
  }
}
```

#### **Download File**

```http
GET {{baseUrl}}/files/download/{{fileKey}}
Authorization: Bearer {{accessToken}}
```

**Response:**

```http
200 OK
Content-Type: text/plain
Content-Length: 1024

[File content as binary data]
```

#### **Get File Metadata**

```http
GET {{baseUrl}}/files/metadata/{{fileKey}}
Authorization: Bearer {{accessToken}}
```

**Response:**

```json
{
  "key": "uploads/1705123456789/abc123-def456-ghi789.txt",
  "size": 1024,
  "mimeType": "text/plain",
  "lastModified": "2024-01-15T10:30:00.000Z",
  "url": "http://localhost:3001/api/files/uploads/1705123456789/abc123-def456-ghi789.txt",
  "etag": "abc123def456ghi789",
  "metadata": {
    "category": "document",
    "uploadedBy": "user-123"
  }
}
```

#### **Get File Stream**

```http
GET {{baseUrl}}/files/stream/{{fileKey}}
Authorization: Bearer {{accessToken}}
```

**Response:**

```http
200 OK
Content-Type: text/plain
Transfer-Encoding: chunked

[File content as stream]
```

#### **Generate Signed URL**

```http
POST {{baseUrl}}/files/signed-url
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "key": "{{fileKey}}",
  "expiresIn": 3600
}
```

**Response:**

```json
{
  "signedUrl": "https://storage.example.com/uploads/1705123456789/abc123-def456-ghi789.txt?signature=abc123&expires=1705123456789"
}
```

#### **Get Public URL**

```http
GET {{baseUrl}}/files/public-url/{{fileKey}}
Authorization: Bearer {{accessToken}}
```

**Response:**

```json
{
  "publicUrl": "https://storage.example.com/uploads/1705123456789/abc123-def456-ghi789.txt"
}
```

#### **Copy File**

```http
POST {{baseUrl}}/files/copy
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "sourceKey": "{{fileKey}}",
  "destinationKey": "copies/{{$timestamp}}/{{$randomUUID}}"
}
```

**Response:**

```json
{
  "key": "copies/1705123456789/def456-ghi789-jkl012.txt",
  "size": 1024,
  "mimeType": "text/plain",
  "lastModified": "2024-01-15T10:35:00.000Z",
  "url": "http://localhost:3001/api/files/copies/1705123456789/def456-ghi789-jkl012.txt"
}
```

#### **Move File**

```http
POST {{baseUrl}}/files/move
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "sourceKey": "{{fileKey}}",
  "destinationKey": "moved/{{$timestamp}}/{{$randomUUID}}"
}
```

**Response:**

```json
{
  "key": "moved/1705123456789/ghi789-jkl012-mno345.txt",
  "size": 1024,
  "mimeType": "text/plain",
  "lastModified": "2024-01-15T10:40:00.000Z",
  "url": "http://localhost:3001/api/files/moved/1705123456789/ghi789-jkl012-mno345.txt"
}
```

#### **List Files**

```http
GET {{baseUrl}}/files/list?prefix=uploads&maxKeys=10
Authorization: Bearer {{accessToken}}
```

**Response:**

```json
[
  {
    "key": "uploads/1705123456789/abc123-def456-ghi789.txt",
    "size": 1024,
    "mimeType": "text/plain",
    "lastModified": "2024-01-15T10:30:00.000Z",
    "url": "http://localhost:3001/api/files/uploads/1705123456789/abc123-def456-ghi789.txt"
  },
  {
    "key": "uploads/1705123456789/def456-ghi789-jkl012.txt",
    "size": 2048,
    "mimeType": "application/pdf",
    "lastModified": "2024-01-15T10:35:00.000Z",
    "url": "http://localhost:3001/api/files/uploads/1705123456789/def456-ghi789-jkl012.txt"
  }
]
```

#### **Check File Exists**

```http
GET {{baseUrl}}/files/exists/{{fileKey}}
Authorization: Bearer {{accessToken}}
```

**Response:**

```json
{
  "exists": true
}
```

#### **Delete File**

```http
DELETE {{baseUrl}}/files/{{fileKey}}
Authorization: Bearer {{accessToken}}
```

**Response:**

```http
204 No Content
```

### **Storage Management Operations**

#### **Get Storage Health Status**

```http
GET {{baseUrl}}/files/health
Authorization: Bearer {{accessToken}}
```

**Response:**

```json
[
  {
    "provider": "local",
    "status": "healthy",
    "responseTime": 100,
    "lastChecked": "2024-01-15T10:30:00.000Z"
  },
  {
    "provider": "s3",
    "status": "unhealthy",
    "responseTime": 0,
    "lastChecked": "2024-01-15T10:30:00.000Z",
    "error": "Connection timeout"
  }
]
```

#### **Get Available Providers**

```http
GET {{baseUrl}}/files/providers
Authorization: Bearer {{accessToken}}
```

**Response:**

```json
["local", "s3", "gcs"]
```

### **Error Scenarios**

#### **File Not Found**

```http
GET {{baseUrl}}/files/metadata/nonexistent-file.txt
Authorization: Bearer {{accessToken}}
```

**Response:**

```json
{
  "statusCode": 404,
  "message": "File not found",
  "error": "Not Found"
}
```

#### **Invalid File Key**

```http
POST {{baseUrl}}/files/upload
Authorization: Bearer {{accessToken}}
Content-Type: multipart/form-data

Form Data:
- file: [Select file]
- key: invalid/key/with/../path
```

**Response:**

```json
{
  "statusCode": 400,
  "message": "Invalid file key",
  "error": "Bad Request"
}
```

#### **Storage Provider Unavailable**

```http
GET {{baseUrl}}/files/health
Authorization: Bearer {{accessToken}}
```

**Response:**

```json
{
  "statusCode": 503,
  "message": "No healthy storage providers available",
  "error": "Service Unavailable"
}
```

## 🎨 Tenant Branding API Features

### **Core Operations**

#### **Get Tenant Branding**

```http
GET {{baseUrl}}/tenants/branding
Authorization: Bearer {{accessToken}}
```

**Response:**

```json
{
  "success": true,
  "branding": {
    "theme": "light",
    "colorScheme": {
      "primary": "#3B82F6",
      "secondary": "#6B7280",
      "accent": "#10B981",
      "background": "#FFFFFF",
      "text": "#1F2937"
    },
    "typography": {
      "fontFamily": "Inter, system-ui, sans-serif",
      "fontSize": "16px",
      "lineHeight": "1.5"
    },
    "logo": {
      "url": "https://example.com/logo.png",
      "type": "image",
      "altText": "Company Logo"
    },
    "customCss": ""
  },
  "tenant": {
    "id": "tenant-123",
    "name": "Example Company"
  },
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### **Update Tenant Branding (Admin Only)**

```http
PUT {{baseUrl}}/tenants/branding
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "theme": "dark",
  "colorScheme": {
    "primary": "#FF5733",
    "secondary": "#33FF57",
    "accent": "#3357FF",
    "background": "#1A1A1A",
    "text": "#FFFFFF"
  },
  "typography": {
    "fontFamily": "Roboto, sans-serif",
    "fontSize": "16px",
    "lineHeight": "1.6"
  },
  "logo": {
    "url": "https://example.com/logo.png",
    "type": "image",
    "altText": "Company Logo"
  },
  "customCss": ".custom-button { border-radius: 8px; }"
}
```

### **Validation Operations**

#### **Validate Branding Configuration**

```http
POST {{baseUrl}}/tenants/branding/validate
Content-Type: application/json

{
  "theme": "light",
  "colorScheme": {
    "primary": "#3B82F6",
    "secondary": "#6B7280"
  },
  "typography": {
    "fontFamily": "Inter, sans-serif",
    "fontSize": "16px"
  }
}
```

**Response:**

```json
{
  "isValid": true,
  "errors": [],
  "warnings": ["Secondary color is recommended"],
  "previewUrl": "/api/tenants/branding/preview?theme=light&primaryColor=%233B82F6"
}
```

### **Preview Operations**

#### **Get Branding Preview**

```http
GET {{baseUrl}}/tenants/branding/preview
Authorization: Bearer {{accessToken}}
```

#### **Generate Branding CSS**

```http
GET {{baseUrl}}/tenants/branding/css
Authorization: Bearer {{accessToken}}
```

**Response:**

```json
{
  "css": ":root {\n  --brand-primary: #3B82F6;\n  --brand-secondary: #6B7280;\n  --brand-accent: #10B981;\n  --brand-background: #FFFFFF;\n  --brand-text: #1F2937;\n  --brand-font-family: Inter, system-ui, sans-serif;\n  --brand-font-size: 16px;\n  --brand-line-height: 1.5;\n}\n\n.custom-button { background-color: var(--brand-primary); color: white; padding: 12px 24px; border-radius: 6px; }"
}
```

### **Export/Import Operations**

#### **Export Branding Configuration**

```http
GET {{baseUrl}}/tenants/branding/export
Authorization: Bearer {{accessToken}}
```

**Response:**

```json
{
  "configuration": {
    "version": "1.0",
    "exportDate": "2024-01-15T10:30:00.000Z",
    "tenant": {
      "id": "tenant-123",
      "name": "Example Company"
    },
    "branding": {
      "theme": "light",
      "colorScheme": {
        "primary": "#3B82F6"
      }
    }
  },
  "exportDate": "2024-01-15T10:30:00.000Z"
}
```

#### **Import Branding Configuration (Admin Only)**

```http
POST {{baseUrl}}/tenants/branding/import
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "version": "1.0",
  "exportDate": "2024-01-15T10:30:00.000Z",
  "tenant": {
    "id": "tenant-123",
    "name": "Example Company"
  },
  "branding": {
    "theme": "dark",
    "colorScheme": {
      "primary": "#FF5733"
    }
  }
}
```

## 🧪 Testing Features

### **Comprehensive Test Scripts**

Each request includes detailed test scripts that verify:

#### **Response Structure Tests**

```javascript
pm.test('Response has required fields', function () {
  const response = pm.response.json();
  pm.expect(response).to.have.property('success');
  pm.expect(response).to.have.property('branding');
  pm.expect(response).to.have.property('tenant');
});
```

#### **Data Validation Tests**

```javascript
pm.test('Branding configuration is valid', function () {
  const response = pm.response.json();
  pm.expect(response.success).to.be.true;
  pm.expect(response.branding).to.have.property('theme');
  pm.expect(response.branding).to.have.property('colorScheme');
});
```

#### **Performance Tests**

```javascript
pm.test('Response time is acceptable', function () {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});
```

#### **Cache Header Tests**

```javascript
pm.test('Cache headers are present', function () {
  pm.expect(pm.response.headers.get('Cache-Control')).to.exist;
  pm.expect(pm.response.headers.get('ETag')).to.exist;
});
```

### **Error Scenario Testing**

#### **Unauthorized Access**

```javascript
pm.test('Status code is 401', function () {
  pm.response.to.have.status(401);
});

pm.test('Error message is clear', function () {
  const response = pm.response.json();
  pm.expect(response.message).to.equal('Unauthorized');
});
```

#### **Forbidden Access (Non-Admin)**

```javascript
pm.test('Status code is 403', function () {
  pm.response.to.have.status(403);
});

pm.test('Error message indicates admin requirement', function () {
  const response = pm.response.json();
  pm.expect(response.message).to.include('Admin access required');
});
```

### **Accessibility Testing**

#### **Low Contrast Warning**

```javascript
pm.test('Accessibility warning provided', function () {
  const response = pm.response.json();
  pm.expect(response.isValid).to.be.true;
  pm.expect(response.warnings).to.include(
    'Text and background colors may not provide sufficient contrast'
  );
});
```

#### **Color Blindness Warning**

```javascript
pm.test('Color blindness warning provided', function () {
  const response = pm.response.json();
  pm.expect(response.isValid).to.be.true;
  pm.expect(response.warnings).to.include(
    'Primary and secondary colors may not be distinguishable for color-blind users'
  );
});
```

## 🔧 Environment Variables

### **Required Variables**

- `baseUrl`: API base URL (e.g., `http://localhost:3001/api`)
- `accessToken`: User authentication token
- `adminToken`: Admin authentication token
- `tenantId`: Current tenant ID

### **Optional Variables**

- `brandingId`: Branding configuration ID
- `exportId`: Export configuration ID
- `refreshToken`: Token refresh token

### **Variable Usage Examples**

#### **Setting Variables from Responses**

```javascript
// Store tenant ID for subsequent requests
if (pm.response.code === 200) {
  const response = pm.response.json();
  pm.environment.set('tenantId', response.tenant.id);
}
```

#### **Using Variables in Requests**

```http
GET {{baseUrl}}/tenants/{{tenantId}}/branding
Authorization: Bearer {{accessToken}}
```

## 📊 Test Categories

### **1. File Storage Operations**

- Upload File
- Download File
- Get File Metadata
- Get File Stream
- Generate Signed URL
- Get Public URL
- Copy File
- Move File
- List Files
- Check File Exists
- Delete File

### **2. Storage Management Operations**

- Get Storage Health Status
- Get Available Providers

### **3. Core Branding Operations**

- Get Tenant Branding
- Update Tenant Branding (Admin Only)
- Reset Tenant Branding (Admin Only)

### **2. Validation Operations**

- Validate Branding Configuration
- Validate Invalid Branding Configuration
- Validate Partial Branding Configuration

### **3. Preview Operations**

- Get Branding Preview
- Generate Branding CSS

### **4. Export/Import Operations**

- Export Branding Configuration
- Import Branding Configuration (Admin Only)
- Import Invalid Configuration (Admin Only)

### **5. Template Operations**

- Get Default Branding Configuration

### **6. Health & Monitoring**

- Branding Service Health Check

### **7. Error Scenarios**

- Unauthorized Access
- Forbidden Access (Non-Admin)
- Invalid Branding Configuration
- Tenant Not Found

### **8. Accessibility Testing**

- Low Contrast Colors Warning
- Color Blindness Warning
- Font Size Accessibility Warning

### **9. Performance Testing**

- Concurrent Branding Requests
- Large CSS Generation

## 🚀 Running Tests

### **Individual Request Testing**

1. Select a request from the collection
2. Set up environment variables
3. Click "Send"
4. Review test results in the "Test Results" tab

### **Collection Testing**

1. Right-click on a collection folder
2. Select "Run collection"
3. Choose environment
4. Configure iteration settings
5. Click "Run"

### **Automated Testing with Newman**

```bash
# Install Newman
npm install -g newman

# Run main collection
newman run postman/collections/SaaS-Boilerplate-API.postman_collection.json \
  --environment postman/environments/Development.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export results.json

# Run dedicated branding collection
newman run postman/collections/Tenant-Branding-API.postman_collection.json \
  --environment postman/environments/Development.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export branding-results.json
```

## 📈 Test Coverage

### **API Endpoint Coverage**

#### **File Storage Endpoints**

- ✅ POST /files/upload
- ✅ GET /files/download/{key}
- ✅ GET /files/metadata/{key}
- ✅ GET /files/stream/{key}
- ✅ POST /files/signed-url
- ✅ GET /files/public-url/{key}
- ✅ POST /files/copy
- ✅ POST /files/move
- ✅ GET /files/list
- ✅ GET /files/exists/{key}
- ✅ DELETE /files/{key}
- ✅ GET /files/health
- ✅ GET /files/providers

#### **Tenant Branding Endpoints**

- ✅ GET /tenants/branding
- ✅ PUT /tenants/branding
- ✅ DELETE /tenants/branding
- ✅ POST /tenants/branding/validate
- ✅ GET /tenants/branding/preview
- ✅ GET /tenants/branding/css
- ✅ GET /tenants/branding/export
- ✅ POST /tenants/branding/import
- ✅ GET /tenants/branding/default
- ✅ GET /tenants/branding/health

### **Test Scenario Coverage**

- ✅ Happy path scenarios
- ✅ Error handling scenarios
- ✅ Authentication scenarios
- ✅ Authorization scenarios
- ✅ Validation scenarios
- ✅ Performance scenarios
- ✅ Accessibility scenarios

## 🔍 Troubleshooting

### **Common Issues**

#### **401 Unauthorized**

- Ensure `accessToken` is set in environment
- Verify token is not expired
- Check token format: `Bearer <token>`

#### **403 Forbidden**

- Use `adminToken` for admin operations
- Verify user has required permissions
- Check tenant access rights

#### **404 Not Found**

- Verify `tenantId` is correct
- Check if tenant exists
- Ensure proper URL path

#### **400 Bad Request**

- Validate request body format
- Check required fields
- Verify data types

### **Debug Tips**

1. Check request headers and body
2. Review response status and body
3. Examine test results for specific failures
4. Verify environment variables
5. Check console logs for additional details

## 📚 Additional Resources

### **Documentation**

- [SOLID Principles Refactoring Guide](../docs/tenant-branding-solid-refactoring.md)
- [API Documentation](../docs/architecture.md)
- [Testing Guidelines](../docs/testing.md)

### **Related Collections**

- [SaaS-Boilerplate-API.postman_collection.json](./SaaS-Boilerplate-API.postman_collection.json) - **Enhanced with comprehensive branding endpoints**
- [Tenant-Branding-API.postman_collection.json](./Tenant-Branding-API.postman_collection.json) - **Dedicated branding collection for detailed testing**

### **Environment Files**

- [Development.postman_environment.json](./environments/Development.postman_environment.json)
- [Staging.postman_environment.json](./environments/Staging.postman_environment.json)
- [Production.postman_environment.json](./environments/Production.postman_environment.json)

## 🤝 Contributing

When adding new endpoints or modifying existing ones:

1. **Update Collections**: Add new requests to appropriate folders
2. **Add Test Scripts**: Include comprehensive test scripts
3. **Update Documentation**: Modify this README with new features
4. **Test Thoroughly**: Ensure all scenarios are covered
5. **Follow Patterns**: Maintain consistency with existing structure

## 📄 License

This project is part of the SaaS Boilerplate and follows the same licensing terms.
