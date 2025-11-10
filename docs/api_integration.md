# API Integration Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Base Configuration](#base-configuration)
3. [Authentication](#authentication)
4. [Common Response Formats](#common-response-formats)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Multi-Factor Authentication](#multi-factor-authentication)
   - [Sessions](#sessions)
   - [Account Recovery](#account-recovery)
   - [Users](#users)
   - [User Profiles](#user-profiles)
   - [User Lifecycle](#user-lifecycle)
   - [Tenants](#tenants)
   - [Teams](#teams)
   - [Invitations](#invitations)
   - [Roles & Permissions](#roles--permissions)
   - [Delegations](#delegations)
   - [Files](#files)
   - [Analytics](#analytics)
   - [Payments](#payments)
   - [Payment Methods](#payment-methods)
   - [Subscriptions](#subscriptions)
   - [Usage Tracking](#usage-tracking)
   - [Billing Portal](#billing-portal)
8. [Best Practices](#best-practices)

---

## Introduction

This document provides comprehensive API integration guidelines for frontend developers working with the SaaS Boilerplate backend API. All endpoints follow RESTful conventions and return JSON responses.

**API Version:** 1.0  
**Base URL:** `http://localhost:3001/api` (Development)  
**Documentation:** `http://localhost:3001/api/docs` (Swagger UI)

---

## Base Configuration

### Base URL

```typescript
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
```

### Content Type

All requests should include:

```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`
}
```

### Tenant Context

For multi-tenant requests, include the tenant ID in headers:

```typescript
headers: {
  'X-Tenant-Id': tenantId
}
```

---

## Authentication

### Token Management

The API uses JWT (JSON Web Tokens) for authentication:

- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

### Token Storage

Store tokens securely:

```typescript
// Store in httpOnly cookies (recommended) or secure localStorage
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

### Token Refresh Flow

```typescript
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    // Redirect to login
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  return data.accessToken;
}
```

---

## Common Response Formats

### Success Response

```typescript
{
  success: true,
  data: { /* response data */ },
  message?: string
}
```

### Paginated Response

```typescript
{
  data: T[],
  total: number,
  page: number,
  limit: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean
}
```

### Error Response

```typescript
{
  statusCode: number,
  message: string | string[],
  error: string,
  timestamp: string,
  path: string
}
```

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Handling Example

```typescript
async function handleApiRequest<T>(
  request: () => Promise<Response>
): Promise<T> {
  try {
    const response = await request();

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.message, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle specific API errors
      if (error.status === 401) {
        // Redirect to login
      }
      throw error;
    }
    throw new Error('Network error');
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Standard endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: Stricter limits (see endpoint documentation)
- **File uploads**: Special rate limits apply

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## API Endpoints

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Create a new user account and tenant.

**Request Body:**

```typescript
{
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantName: string;
  tenantDomain?: string;
}
```

**Response:** `201 Created`

```typescript
{
  message: string;
  userId: string;
  tenantId: string;
}
```

**Example:**

```typescript
const response = await fetch(`${API_BASE_URL}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Doe',
    tenantName: 'Acme Corp',
  }),
});
```

---

### Login

**POST** `/auth/login`

Authenticate user and receive access tokens.

**Request Body:**

```typescript
{
  email: string;
  password: string;
}
```

**Response:** `200 OK`

```typescript
{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    tenantId: string;
    avatar?: string;
    lastLoginAt: string;
  }
}
```

**Example:**

```typescript
const response = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
  }),
});

const data = await response.json();
// Store tokens
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);
```

---

### Refresh Token

**POST** `/auth/refresh`

Obtain a new access token using refresh token.

**Request Body:**

```typescript
{
  refreshToken: string;
}
```

**Response:** `200 OK`

```typescript
{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    /* user object */
  }
}
```

---

### Logout

**POST** `/auth/logout`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  refreshToken: string;
}
```

**Response:** `200 OK`

```typescript
{
  message: string;
}
```

---

### Get Profile

**GET** `/auth/profile`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  tenantId: string;
  avatar?: string;
  emailVerified: boolean;
  lastLoginAt: string;
}
```

---

### Verify Email

**POST** `/auth/verify-email`

**Request Body:**

```typescript
{
  token: string;
}
```

**Response:** `200 OK`

```typescript
{
  message: string;
}
```

---

### Resend Verification Email

**POST** `/auth/resend-verification`

**Request Body:**

```typescript
{
  email: string;
}
```

**Response:** `200 OK`

```typescript
{
  message: string;
}
```

---

### Forgot Password

**POST** `/auth/forgot-password`

**Rate Limit:** 3 requests per hour

**Request Body:**

```typescript
{
  email: string;
}
```

**Response:** `200 OK`

```typescript
{
  message: string;
}
```

---

### Validate Reset Token

**POST** `/auth/validate-reset-token`

**Rate Limit:** 10 requests per minute

**Request Body:**

```typescript
{
  token: string;
}
```

**Response:** `200 OK`

```typescript
{
  valid: boolean;
  message: string;
}
```

---

### Reset Password

**POST** `/auth/reset-password`

**Rate Limit:** 5 requests per 5 minutes

**Request Body:**

```typescript
{
  token: string;
  newPassword: string;
}
```

**Response:** `200 OK`

```typescript
{
  message: string;
  status: string;
  userId: string;
  tenantId: string;
}
```

---

### Verify MFA and Complete Login

**POST** `/auth/mfa/verify`

**Request Body:**

```typescript
{
  userId: string;
  token: string; // TOTP code or backup code
}
```

**Response:** `200 OK`

```typescript
{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    /* user object */
  }
}
```

---

## Multi-Factor Authentication

### Setup MFA

**POST** `/auth/mfa/setup`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  userId: string;
}
```

**Response:** `201 Created`

```typescript
{
  secret: string;
  qrCode: string; // Base64 encoded QR code
  backupCodes: string[];
}
```

---

### Enable MFA

**POST** `/auth/mfa/enable`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  token: string; // TOTP code to verify
}
```

**Response:** `200 OK`

```typescript
{
  message: string;
}
```

---

### Disable MFA

**POST** `/auth/mfa/disable`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  token: string; // TOTP code to verify
}
```

**Response:** `200 OK`

```typescript
{
  message: string;
}
```

---

### Verify MFA Code

**POST** `/auth/mfa/verify`

**Request Body:**

```typescript
{
  userId: string;
  token: string;
}
```

**Response:** `200 OK`

```typescript
{
  isValid: boolean;
  message: string;
}
```

---

### Get MFA Status

**GET** `/auth/mfa/status`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  enabled: boolean;
  verified: boolean;
  backupCodesRemaining: number;
}
```

---

### Regenerate Backup Codes

**POST** `/auth/mfa/backup-codes/regenerate`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  token: string; // TOTP code to verify
}
```

**Response:** `200 OK`

```typescript
{
  backupCodes: string[];
}
```

---

## Sessions

### Get User Sessions

**GET** `/sessions`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  sessions: Array<{
    id: string;
    userId: string;
    deviceInfo: string;
    ipAddress: string;
    userAgent: string;
    isActive: boolean;
    isTrusted: boolean;
    createdAt: string;
    lastActivityAt: string;
    expiresAt: string;
  }>;
  total: number;
  activeCount: number;
  trustedCount: number;
}
```

---

### Get Active Sessions

**GET** `/sessions/active`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
Array<SessionResponseDto>;
```

---

### Get Session by ID

**GET** `/sessions/:id`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
SessionResponseDto;
```

---

### Update Session

**PUT** `/sessions/:id`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  deviceInfo?: string;
  isTrusted?: boolean;
}
```

**Response:** `200 OK`

```typescript
SessionResponseDto;
```

---

### Revoke Session

**DELETE** `/sessions/:id`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  reason?: string;
}
```

**Response:** `204 No Content`

---

### Revoke All Sessions

**DELETE** `/sessions`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  reason?: string;
}
```

**Response:** `204 No Content`

---

### Revoke Other Sessions

**DELETE** `/sessions/others`

**Headers:** `Authorization: Bearer {token}`, `X-Session-Id: {currentSessionId}`

**Request Body:**

```typescript
{
  reason?: string;
}
```

**Response:** `204 No Content`

---

### Mark Device as Trusted

**POST** `/sessions/:id/trust`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
SessionResponseDto;
```

---

### Update Session Activity

**POST** `/sessions/:id/activity`

**Headers:** `Authorization: Bearer {token}`

**Response:** `204 No Content`

---

### Extend Session

**POST** `/sessions/:id/extend`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  additionalMinutes: number;
}
```

**Response:** `200 OK`

```typescript
SessionResponseDto;
```

---

### Mark Session as Suspicious

**POST** `/sessions/:id/suspicious`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
SessionResponseDto;
```

---

### Get Session Statistics

**GET** `/sessions/stats/summary`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  total: number;
  active: number;
  trusted: number;
  suspicious: number;
  expired: number;
  revoked: number;
}
```

---

## Account Recovery

### Initiate Recovery

**POST** `/auth/recovery/initiate`

**Rate Limit:** 3 requests per minute

**Request Body:**

```typescript
{
  email: string;
}
```

**Response:** `200 OK`

```typescript
{
  message: string;
}
```

---

### Verify Recovery

**POST** `/auth/recovery/verify`

**Rate Limit:** 5 requests per minute

**Request Body:**

```typescript
{
  recoveryToken: string;
  backupCode: string;
}
```

**Response:** `200 OK`

```typescript
{
  recoverySessionToken: string;
  expiresAt: string;
  remainingAttempts: number;
}
```

---

### Complete Recovery

**POST** `/auth/recovery/complete`

**Rate Limit:** 3 requests per minute

**Request Body:**

```typescript
{
  recoverySessionToken: string;
  newTotpSecret?: string;
}
```

**Response:** `200 OK`

```typescript
{
  secret: string;
  qrCode: string;
  backupCodes: string[];
}
```

---

### Get Recovery Status

**GET** `/auth/recovery/status?recoverySessionToken={token}`

**Response:** `200 OK`

```typescript
{
  isRecoveryInProgress: boolean;
  recoverySessionExpiresAt: string;
  remainingAttempts: number;
}
```

---

### Attempt Backup Code

**POST** `/auth/recovery/attempt`

**Rate Limit:** 5 requests per minute

**Request Body:**

```typescript
{
  recoverySessionToken: string;
  backupCode: string;
}
```

**Response:** `200 OK`

```typescript
{
  isValid: boolean;
  remainingAttempts: number;
}
```

---

## Users

### Create User

**POST** `/users`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Required Roles:** ADMIN, OWNER

**Request Body:**

```typescript
{
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}
```

**Response:** `201 Created`

```typescript
UserResponseDto;
```

---

### Get All Users

**GET** `/users?page=1&limit=10&search={term}&role={role}&status={status}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Required Roles:** ADMIN, OWNER, MANAGER

**Query Parameters:**

- `page`: number (default: 1)
- `limit`: number (default: 10)
- `search`: string
- `role`: UserRole
- `status`: UserStatus

**Response:** `200 OK`

```typescript
PaginatedResponse<UserResponseDto>;
```

---

### Get User by ID

**GET** `/users/:id`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Required Roles:** ADMIN, OWNER, MANAGER

**Response:** `200 OK`

```typescript
UserResponseDto;
```

---

### Update User

**PATCH** `/users/:id`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Required Roles:** ADMIN, OWNER

**Request Body:**

```typescript
{
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
}
```

**Response:** `200 OK`

```typescript
UserResponseDto;
```

---

### Delete User

**DELETE** `/users/:id`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Required Roles:** ADMIN, OWNER

**Response:** `204 No Content`

---

## User Profiles

### Create Profile

**POST** `/profiles`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  bio?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  dateOfBirth?: string;
  website?: string;
  socialLinks?: Record<string, string>;
}
```

**Response:** `201 Created`

```typescript
ProfileResponseDto;
```

---

### Get My Profile

**GET** `/profiles/me`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
ProfileResponseDto;
```

---

### Get Profile Completion

**GET** `/profiles/me/completion`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  completionPercentage: number;
  missingFields: string[];
  completedFields: string[];
}
```

---

### Get Profile by ID

**GET** `/profiles/:id`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
ProfileResponseDto;
```

---

### Update Profile

**PUT** `/profiles/me`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  bio?: string;
  phone?: string;
  address?: string;
  // ... other fields
}
```

**Response:** `200 OK`

```typescript
ProfileResponseDto;
```

---

### Upload Avatar

**POST** `/profiles/me/avatar`

**Headers:** `Authorization: Bearer {token}`, `Content-Type: multipart/form-data`

**Request:** FormData with `file` field

**File Requirements:**

- Max size: 5MB
- Types: JPEG, PNG, GIF, WebP

**Response:** `201 Created`

```typescript
ProfileResponseDto;
```

**Example:**

```typescript
const formData = new FormData();
formData.append('file', file);

const response = await fetch(`${API_BASE_URL}/profiles/me/avatar`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

---

### Delete Avatar

**DELETE** `/profiles/me/avatar`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
ProfileResponseDto;
```

---

### Delete Profile

**DELETE** `/profiles/me`

**Headers:** `Authorization: Bearer {token}`

**Response:** `204 No Content`

---

## User Lifecycle

### Register User (Admin)

**POST** `/users/lifecycle`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Request Body:**

```typescript
{
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  sendEmailVerification?: boolean;
  sendWelcomeEmail?: boolean;
}
```

**Response:** `201 Created`

```typescript
UserLifecycleResponseDto;
```

---

### Bulk Activate Users

**POST** `/users/lifecycle/activate`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Request Body:**

```typescript
{
  userIds: string[];
  auditEvent?: string;
}
```

**Response:** `200 OK`

```typescript
{
  successCount: number;
  failureCount: number;
  successfulUserIds: string[];
  errors: Array<{ userId: string; error: string }>;
}
```

---

### Activate User

**PUT** `/users/lifecycle/:id/activate`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Request Body:**

```typescript
{
  skipEmailVerification?: boolean;
  auditEvent?: string;
}
```

**Response:** `200 OK`

```typescript
UserLifecycleResponseDto;
```

---

### Suspend User

**PUT** `/users/lifecycle/:id/suspend`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Request Body:**

```typescript
{
  reason?: string;
  duration?: number; // in days
  auditEvent?: string;
}
```

**Response:** `200 OK`

```typescript
UserLifecycleResponseDto;
```

---

### Reactivate User

**PUT** `/users/lifecycle/:id/reactivate`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Request Body:**

```typescript
{
  auditEvent?: string;
}
```

**Response:** `200 OK`

```typescript
UserLifecycleResponseDto;
```

---

### Delete User

**DELETE** `/users/lifecycle/:id`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Request Body:**

```typescript
{
  auditEvent?: string;
}
```

**Response:** `204 No Content`

---

### Get User Lifecycle Info

**GET** `/users/lifecycle/:id/lifecycle`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Response:** `200 OK`

```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  isActive: boolean;
  isSuspended: boolean;
  isDeleted: boolean;
  suspensionInfo?: {
    reason: string;
    suspendedAt: string;
    suspendedUntil?: string;
  };
}
```

---

## Tenants

### Create Tenant

**POST** `/tenants`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Request Body:**

```typescript
{
  name: string;
  domain: string;
  planId?: string;
  settings?: Record<string, any>;
}
```

**Response:** `201 Created`

```typescript
Tenant;
```

---

### Get Tenants

**GET** `/tenants?page=1&limit=10&search={term}`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Response:** `200 OK`

```typescript
PaginatedResponse<Tenant>;
```

---

### Get Tenant Statistics

**GET** `/tenants/statistics`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Response:** `200 OK`

```typescript
{
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  // ... other stats
}
```

---

### Get Tenant by ID

**GET** `/tenants/:id`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Response:** `200 OK`

```typescript
Tenant;
```

---

### Get Tenant by Domain

**GET** `/tenants/domain/:domain`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Response:** `200 OK`

```typescript
Tenant;
```

---

### Update Tenant

**PUT** `/tenants/:id`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Request Body:**

```typescript
{
  name?: string;
  domain?: string;
  settings?: Record<string, any>;
}
```

**Response:** `200 OK`

```typescript
Tenant;
```

---

### Delete Tenant

**DELETE** `/tenants/:id`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Response:** `204 No Content`

---

### Restore Tenant

**POST** `/tenants/:id/restore`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Response:** `200 OK`

```typescript
Tenant;
```

---

### Verify Tenant

**POST** `/tenants/:id/verify`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Response:** `200 OK`

```typescript
Tenant;
```

---

### Get Tenant Usage

**GET** `/tenants/:id/usage`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Response:** `200 OK`

```typescript
{
  metrics: Array<{
    metric: string;
    value: number;
    limit?: number;
    percentage?: number;
  }>;
}
```

---

### Update Tenant Usage

**PUT** `/tenants/:id/usage/:metric`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Path Parameters:**

- `metric`: One of: `api_calls`, `storage_bytes`, `users`, `emails_sent`, etc.

**Request Body:**

```typescript
{
  value: number;
  limit?: number;
}
```

**Response:** `200 OK`

```typescript
TenantUsage;
```

---

### Get Tenant Features

**GET** `/tenants/:id/features`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Response:** `200 OK`

```typescript
Array<TenantFeatureFlag>;
```

---

### Check Feature Enabled

**GET** `/tenants/:id/features/:feature`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Response:** `200 OK`

```typescript
{
  enabled: boolean;
}
```

---

### Update Feature Flag

**PUT** `/tenants/:id/features/:feature`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Request Body:**

```typescript
{
  enabled: boolean;
  config?: Record<string, any>;
}
```

**Response:** `200 OK`

```typescript
TenantFeatureFlag;
```

---

### Bulk Update Feature Flags

**PUT** `/tenants/:id/features/bulk`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Request Body:**

```typescript
{
  updates: Array<{
    feature: string;
    enabled: boolean;
    config?: Record<string, any>;
  }>;
}
```

**Response:** `200 OK`

```typescript
Array<TenantFeatureFlag>;
```

---

### Get Feature Flags Statistics

**GET** `/tenants/:id/features/stats`

**Headers:** `Authorization: Bearer {token}`

**Required Roles:** ADMIN, OWNER

**Response:** `200 OK`

```typescript
{
  total: number;
  enabled: number;
  disabled: number;
}
```

---

## Teams

### Create Team

**POST** `/teams`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  name: string;
  description?: string;
  managerId?: string;
}
```

**Response:** `201 Created`

```typescript
TeamResponseDto;
```

---

### Get Teams

**GET** `/teams?page=1&limit=10&search={term}&status={status}&managerId={id}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  teams: TeamResponseDto[];
  total: number;
}
```

---

### Get My Teams

**GET** `/teams/my-teams`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
Array<TeamResponseDto>;
```

---

### Get Team by ID

**GET** `/teams/:id`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
TeamResponseDto;
```

---

### Update Team

**PUT** `/teams/:id`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  name?: string;
  description?: string;
  managerId?: string;
}
```

**Response:** `200 OK`

```typescript
TeamResponseDto;
```

---

### Delete Team

**DELETE** `/teams/:id`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `204 No Content`

---

### Get Team Analytics

**GET** `/teams/:id/analytics`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
TeamAnalyticsDto;
```

---

### Add Team Member

**POST** `/teams/:id/members`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  userId: string;
  roleId?: string;
}
```

**Response:** `201 Created`

```typescript
TeamMemberResponseDto;
```

---

### Get Team Members

**GET** `/teams/:id/members?page=1&limit=10&status={status}&roleId={id}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  members: TeamMemberResponseDto[];
  total: number;
}
```

---

### Update Team Member

**PUT** `/teams/:id/members/:memberId`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  roleId?: string;
  status?: string;
}
```

**Response:** `200 OK`

```typescript
TeamMemberResponseDto;
```

---

### Remove Team Member

**DELETE** `/teams/:id/members/:userId`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `204 No Content`

---

### Invite Team Member

**POST** `/teams/:id/invitations`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  email: string;
  roleId?: string;
  message?: string;
}
```

**Response:** `201 Created`

```typescript
TeamInvitationResponseDto;
```

---

### Get Team Invitations

**GET** `/teams/:id/invitations?page=1&limit=10&status={status}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  invitations: TeamInvitationResponseDto[];
  total: number;
}
```

---

### Cancel Team Invitation

**PUT** `/teams/:id/invitations/:invitationId/cancel`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `204 No Content`

---

### Accept Team Invitation

**POST** `/teams/invitations/accept`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  token: string;
}
```

**Response:** `201 Created`

```typescript
TeamMemberResponseDto;
```

---

## Invitations

### Create Invitation

**POST** `/invitations`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  email: string;
  role: UserRole;
  expiresIn?: number; // hours
  message?: string;
}
```

**Response:** `201 Created`

```typescript
InvitationResponseDto;
```

---

### Get Invitations

**GET** `/invitations?page=1&limit=10&status={status}&email={email}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
PaginatedResponse<InvitationResponseDto>;
```

---

### Get Invitation Statistics

**GET** `/invitations/stats`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  total: number;
  pending: number;
  accepted: number;
  expired: number;
  revoked: number;
}
```

---

### Get Invitation by ID

**GET** `/invitations/:id`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
InvitationResponseDto;
```

---

### Update Invitation

**PUT** `/invitations/:id`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  role?: UserRole;
  expiresIn?: number;
  message?: string;
}
```

**Response:** `200 OK`

```typescript
InvitationResponseDto;
```

---

### Revoke Invitation

**DELETE** `/invitations/:id`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `204 No Content`

---

### Resend Invitation

**POST** `/invitations/:id/resend`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
InvitationResponseDto;
```

---

### Accept Invitation

**POST** `/invitations/accept/:token`

**Request Body:**

```typescript
{
  password: string;
  firstName: string;
  lastName: string;
}
```

**Response:** `200 OK`

```typescript
{
  user: User;
  invitation: InvitationResponseDto;
}
```

---

## Roles & Permissions

### Create Role

**POST** `/roles`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  name: string;
  description?: string;
  type: 'system' | 'custom';
  level: RoleLevel;
  tenantId?: string;
  parentRoleId?: string;
  metadata?: Record<string, any>;
}
```

**Response:** `201 Created`

```typescript
RoleResponseDto;
```

---

### Get All Roles

**GET** `/roles?page=1&limit=50&level={level}`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  roles: RoleResponseDto[];
  total: number;
  page: number;
  limit: number;
}
```

---

### Get System Roles

**GET** `/roles/system`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
Array<RoleResponseDto>;
```

---

### Get Custom Roles

**GET** `/roles/custom`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
Array<RoleResponseDto>;
```

---

### Get Role by ID

**GET** `/roles/:id`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
RoleResponseDto;
```

---

### Update Role

**PUT** `/roles/:id`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
}
```

**Response:** `200 OK`

```typescript
RoleResponseDto;
```

---

### Delete Role

**DELETE** `/roles/:id`

**Headers:** `Authorization: Bearer {token}`

**Response:** `204 No Content`

---

### Assign Permissions to Role

**POST** `/roles/:id/permissions`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  permissionIds: string[];
}
```

**Response:** `200 OK`

```typescript
RoleResponseDto;
```

---

### Remove Permissions from Role

**DELETE** `/roles/:id/permissions`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
string[] // Array of permission IDs
```

**Response:** `204 No Content`

---

### Assign Role to User

**POST** `/roles/users/:userId/roles`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  roleId: string;
  tenantId?: string;
}
```

**Response:** `201 Created`

---

### Remove Role from User

**DELETE** `/roles/users/:userId/roles/:roleId`

**Headers:** `Authorization: Bearer {token}`

**Response:** `204 No Content`

---

### Get User Roles

**GET** `/roles/users/:userId/roles`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  userRoles: Array<{
    role: RoleResponseDto;
    assignedAt: string;
    assignedBy?: string;
  }>;
  total: number;
}
```

---

### Get User Permissions

**GET** `/roles/users/:userId/permissions`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
string[] // Array of permission strings
```

---

### Check User Permission

**POST** `/roles/users/:userId/permissions/check`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  resource: string;
  action: string;
  scope?: string;
}
```

**Response:** `200 OK`

```typescript
{
  hasPermission: boolean;
}
```

---

### Create Permission

**POST** `/permissions`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  name: string;
  description?: string;
  resource: PermissionResource;
  action: PermissionAction;
  scope?: PermissionScope;
  conditions?: Record<string, any>;
}
```

**Response:** `201 Created`

```typescript
PermissionResponseDto;
```

---

### Get All Permissions

**GET** `/permissions?page=1&limit=50&scope={scope}&resource={resource}`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  permissions: PermissionResponseDto[];
  total: number;
  page: number;
  limit: number;
}
```

---

### Get System Permissions

**GET** `/permissions/system`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
Array<PermissionResponseDto>;
```

---

### Get Custom Permissions

**GET** `/permissions/custom`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
Array<PermissionResponseDto>;
```

---

### Get Permission Scopes

**GET** `/permissions/scopes`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
Array<PermissionScope>;
```

---

### Get Permission Resources

**GET** `/permissions/resources`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
Array<PermissionResource>;
```

---

### Get Permission Actions

**GET** `/permissions/actions`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
Array<PermissionAction>;
```

---

### Get Permission by ID

**GET** `/permissions/:id`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
PermissionResponseDto;
```

---

### Update Permission

**PUT** `/permissions/:id`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  name?: string;
  description?: string;
  conditions?: Record<string, any>;
}
```

**Response:** `200 OK`

```typescript
PermissionResponseDto;
```

---

### Delete Permission

**DELETE** `/permissions/:id`

**Headers:** `Authorization: Bearer {token}`

**Response:** `204 No Content`

---

### Check Permission

**POST** `/permissions/check`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  resource: string;
  action: string;
  scope?: string;
}
```

**Response:** `200 OK`

```typescript
{
  hasPermission: boolean;
  resource: string;
  action: string;
  userId: string;
  grantedByRoles: string[];
  scope?: string;
}
```

---

### Initialize Default Permissions

**POST** `/permissions/initialize`

**Headers:** `Authorization: Bearer {token}`

**Response:** `201 Created`

```typescript
{
  message: string;
}
```

---

## Delegations

### Create Delegation

**POST** `/delegations`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  delegateId: string;
  delegationType: 'permission_based' | 'role_based' | 'full_access';
  permissionIds?: string[];
  roleIds?: string[];
  startDate: string;
  endDate: string;
  reason: string;
  requiresApproval: boolean;
  approverId?: string;
  isEmergency?: boolean;
}
```

**Response:** `201 Created`

```typescript
DelegationResponseDto;
```

---

### Get Delegations

**GET** `/delegations?page=1&limit=10&status={status}&delegationType={type}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
PaginatedResponse<DelegationResponseDto>;
```

---

### Get Delegation Statistics

**GET** `/delegations/stats`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  total: number;
  pending: number;
  approved: number;
  active: number;
  expired: number;
  revoked: number;
}
```

---

### Get My Active Delegations

**GET** `/delegations/my-active`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
Array<DelegationResponseDto>;
```

---

### Get Pending Approvals

**GET** `/delegations/pending-approvals`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
Array<DelegationResponseDto>;
```

---

### Get Delegation by ID

**GET** `/delegations/:id`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
DelegationResponseDto;
```

---

### Approve Delegation

**PUT** `/delegations/:id/approve`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  comments?: string;
}
```

**Response:** `200 OK`

```typescript
DelegationResponseDto;
```

---

### Reject Delegation

**PUT** `/delegations/:id/reject`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  reason: string;
  comments?: string;
}
```

**Response:** `200 OK`

```typescript
DelegationResponseDto;
```

---

### Activate Delegation

**PUT** `/delegations/:id/activate`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  comments?: string;
}
```

**Response:** `200 OK`

```typescript
DelegationResponseDto;
```

---

### Revoke Delegation

**PUT** `/delegations/:id/revoke`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  reason: string;
  comments?: string;
}
```

**Response:** `200 OK`

```typescript
DelegationResponseDto;
```

---

### Get Delegation Audit Logs

**GET** `/delegations/:id/audit-logs`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
Array<DelegationAuditLogResponseDto>;
```

---

### Check Delegation Permissions

**POST** `/delegations/check-permissions`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  userId: string;
  permissionIds: string[];
}
```

**Response:** `200 OK`

```typescript
{
  hasDelegation: boolean;
}
```

---

## Files

### Upload File

**POST** `/files/upload`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`, `Content-Type: multipart/form-data`

**Request:** FormData with `file` and optional metadata

**File Requirements:**

- Max size: 10MB
- Types: JPG, JPEG, PNG, GIF, PDF, DOC, DOCX, TXT

**Request Body (FormData):**

```typescript
{
  file: File;
  folder?: string;
  visibility?: 'private' | 'public';
  tags?: string[];
  metadata?: Record<string, any>;
}
```

**Response:** `201 Created`

```typescript
{
  success: boolean;
  data: {
    key: string;
    originalName: string;
    mimeType: string;
    size: number;
    publicUrl?: string;
    uploadedAt: string;
  };
  message: string;
}
```

**Example:**

```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('folder', 'documents');
formData.append('visibility', 'private');

const response = await fetch(`${API_BASE_URL}/files/upload`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
  },
  body: formData,
});
```

---

### Get File Metadata

**GET** `/files/metadata?key={fileKey}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
FileMetadataResponseDto;
```

---

### Download File

**GET** `/files/download?key={fileKey}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK` (Binary file)

**Example:**

```typescript
const response = await fetch(`${API_BASE_URL}/files/download?key=${fileKey}`, {
  headers: {
    Authorization: `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
  },
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
// Use URL for download
```

---

### Stream File

**GET** `/files/stream?key={fileKey}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK` (Streaming binary)

---

### List Files

**GET** `/files/list?page=1&limit=10&prefix={prefix}&search={term}&status={status}&visibility={visibility}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: {
    files: FileMetadataResponseDto[];
    total: number;
    page: number;
    limit: number;
  };
  message: string;
}
```

---

### Delete File

**DELETE** `/files?key={fileKey}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `204 No Content`

---

### Get Signed URL

**POST** `/files/signed-url`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  key: string;
  expiresIn?: number; // seconds, default: 3600
}
```

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: {
    signedUrl: string;
    expiresAt: string;
    key: string;
  }
  message: string;
}
```

---

### Get Public URL

**GET** `/files/public-url?key={fileKey}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: {
    publicUrl: string;
    key: string;
  }
  message: string;
}
```

---

### Copy File

**POST** `/files/copy`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  sourceKey: string;
  destinationKey: string;
}
```

**Response:** `201 Created`

```typescript
{
  success: boolean;
  data: {
    sourceKey: string;
    destinationKey: string;
    metadata: FileMetadataResponseDto;
  }
  message: string;
}
```

---

### Move File

**POST** `/files/move`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  sourceKey: string;
  destinationKey: string;
}
```

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: {
    sourceKey: string;
    destinationKey: string;
    metadata: FileMetadataResponseDto;
  }
  message: string;
}
```

---

### Check File Exists

**GET** `/files/exists?key={fileKey}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: {
    exists: boolean;
    key: string;
  }
  message: string;
}
```

---

### Get Storage Health

**GET** `/files/health`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: {
    status: string;
    providers: Array<{
      name: string;
      status: string;
      priority: number;
    }>;
    timestamp: string;
  }
  message: string;
}
```

---

### Get Storage Providers

**GET** `/files/providers`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: Array<{
    name: string;
    status: string;
    priority: number;
  }>;
  message: string;
}
```

---

### Get Storage Statistics

**GET** `/files/stats`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: {
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    filesByStatus: Record<string, number>;
    filesByVisibility: Record<string, number>;
  }
  message: string;
}
```

---

## Analytics

### Track Event

**POST** `/analytics/events/track`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  eventName: string;
  eventType: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
}
```

**Response:** `201 Created`

```typescript
{
  id: string;
  eventName: string;
  eventType: string;
  timestamp: string;
}
```

---

### Bulk Track Events

**POST** `/analytics/events/track/bulk`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  events: Array<{
    eventName: string;
    eventType: string;
    properties?: Record<string, any>;
    userId?: string;
    timestamp?: string;
  }>;
}
```

**Response:** `201 Created`

```typescript
{
  successCount: number;
  failureCount: number;
  events: Array<{
    id: string;
    eventName: string;
  }>;
}
```

---

### Get Events

**GET** `/analytics/events?userId={id}&eventType={type}&eventName={name}&startDate={date}&endDate={date}&limit={limit}&offset={offset}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
Array<AnalyticsEventResponseDto>;
```

---

### Get Aggregates

**GET** `/analytics/aggregates?metricName={name}&period={period}&startDate={date}&endDate={date}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
Array<AnalyticsAggregateResponseDto>;
```

---

### Get Dashboard

**GET** `/analytics/dashboard?period={period}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  summary: AnalyticsSummaryResponseDto;
  realTimeMetrics: RealTimeMetricsResponseDto;
  topEvents: Array<AnalyticsEventResponseDto>;
  trends: Array<AnalyticsAggregateResponseDto>;
}
```

---

### Get Summary

**GET** `/analytics/summary?period={period}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  totalEvents: number;
  uniqueUsers: number;
  period: {
    startDate: string;
    endDate: string;
  }
}
```

---

### Get Real-Time Metrics

**GET** `/analytics/realtime?metricNames={names}&timeRange={range}`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  metrics: Array<{
    name: string;
    value: number;
    timestamp: string;
  }>;
  timestamp: string;
}
```

---

### Generate Report

**POST** `/analytics/reports`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  reportType: string;
  format: 'pdf' | 'csv' | 'json';
  startDate: string;
  endDate: string;
  metrics: string[];
  filters?: Record<string, any>;
}
```

**Response:** `201 Created`

```typescript
{
  reportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedCompletionTime?: string;
}
```

---

### Get Report

**GET** `/analytics/reports/:reportId`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  reportId: string;
  status: string;
  downloadUrl?: string;
  storageKey?: string;
  createdAt: string;
  completedAt?: string;
}
```

---

### Download Report

**GET** `/analytics/reports/:reportId/download`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK` (File download or redirect)

---

### Create Alert

**POST** `/analytics/alerts`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  name: string;
  metricName: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  notificationChannels: string[];
  enabled: boolean;
}
```

**Response:** `201 Created`

```typescript
AlertResponseDto;
```

---

### Get Alerts

**GET** `/analytics/alerts`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
Array<AlertResponseDto>;
```

---

### Get Alert by ID

**GET** `/analytics/alerts/:alertId`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
AlertResponseDto;
```

---

### Update Alert

**PUT** `/analytics/alerts/:alertId`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  name?: string;
  condition?: string;
  threshold?: number;
  enabled?: boolean;
}
```

**Response:** `200 OK`

```typescript
AlertResponseDto;
```

---

### Delete Alert

**DELETE** `/analytics/alerts/:id`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

---

### Export Analytics

**POST** `/analytics/export`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Request Body:**

```typescript
{
  format: 'csv' | 'json' | 'xlsx';
  startDate: string;
  endDate: string;
  filters?: Record<string, any>;
  includeFields?: string[];
}
```

**Response:** `201 Created`

```typescript
{
  exportId: string;
  status: string;
  estimatedCompletionTime?: string;
}
```

---

### Get Export

**GET** `/analytics/export/:exportId`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  exportId: string;
  status: string;
  downloadUrl?: string;
  createdAt: string;
}
```

---

### Get Analytics Health

**GET** `/analytics/health`

**Headers:** `Authorization: Bearer {token}`, `X-Tenant-Id: {tenantId}`

**Response:** `200 OK`

```typescript
{
  status: string;
  database: string;
  eventProcessing: string;
  timestamp: string;
}
```

---

## Payments

### Create Payment

**POST** `/payments`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  amount: number;
  currency: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, any>;
}
```

**Response:** `201 Created`

```typescript
Payment;
```

---

### Confirm Payment

**POST** `/payments/confirm`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  paymentIntentId: string;
  paymentMethodId?: string;
}
```

**Response:** `200 OK`

```typescript
Payment;
```

---

### Capture Payment

**POST** `/payments/capture`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  paymentIntentId: string;
  amount?: number;
}
```

**Response:** `200 OK`

```typescript
Payment;
```

---

### Cancel Payment

**POST** `/payments/cancel/:paymentIntentId`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  reason?: string;
}
```

**Response:** `200 OK`

```typescript
Payment;
```

---

### Refund Payment

**POST** `/payments/refund`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  paymentId: string;
  amount?: number;
  reason?: string;
}
```

**Response:** `201 Created`

```typescript
PaymentRefund;
```

---

### List Payments

**GET** `/payments?status={status}&limit={limit}&offset={offset}`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  payments: Payment[];
  total: number;
}
```

---

### Get Payment by ID

**GET** `/payments/:paymentId`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
Payment;
```

---

### Get Payment Intent

**GET** `/payments/intent/:paymentIntentId`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
PaymentIntent;
```

---

### Test Stripe Connectivity

**GET** `/payments/stripe/test-connectivity`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  message: string;
  account?: {
    id: string;
    email: string;
    country: string;
    currency: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  };
  config?: {
    apiVersion: string;
    maxNetworkRetries: number;
    timeout: number;
  };
  error?: string;
}
```

---

## Payment Methods

### Create Payment Method

**POST** `/payment-methods`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  type: 'card' | 'bank_account' | 'paypal';
  token: string; // Stripe payment method token
  isDefault?: boolean;
}
```

**Response:** `201 Created`

```typescript
PaymentMethod;
```

---

### Update Payment Method

**PUT** `/payment-methods/:paymentMethodId`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  isDefault?: boolean;
  metadata?: Record<string, any>;
}
```

**Response:** `200 OK`

```typescript
PaymentMethod;
```

---

### Delete Payment Method

**DELETE** `/payment-methods/:paymentMethodId`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

---

### List Payment Methods

**GET** `/payment-methods?type={type}&status={status}&limit={limit}&offset={offset}`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  paymentMethods: PaymentMethod[];
  total: number;
}
```

---

### Get Default Payment Method

**GET** `/payment-methods/default`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
PaymentMethod | null;
```

---

### Get Payment Method by ID

**GET** `/payment-methods/:paymentMethodId`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
PaymentMethod;
```

---

### Set Default Payment Method

**POST** `/payment-methods/:paymentMethodId/set-default`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
PaymentMethod;
```

---

### Validate Payment Method

**POST** `/payment-methods/:paymentMethodId/validate`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  valid: boolean;
}
```

---

## Subscriptions

### Create Subscription

**POST** `/subscriptions`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  planId: string;
  paymentMethodId?: string;
  trialDays?: number;
  metadata?: Record<string, any>;
}
```

**Response:** `201 Created`

```typescript
SubscriptionResponseDto;
```

---

### Get Subscriptions

**GET** `/subscriptions?tenantId={id}&userId={id}&status={status}`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
Array<SubscriptionResponseDto>;
```

---

### Get Subscription by ID

**GET** `/subscriptions/:id`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
SubscriptionResponseDto;
```

---

### Update Subscription

**PUT** `/subscriptions/:id`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  planId?: string;
  metadata?: Record<string, any>;
}
```

**Response:** `200 OK`

```typescript
SubscriptionResponseDto;
```

---

### Cancel Subscription

**POST** `/subscriptions/:id/cancel`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  reason?: string;
  cancelAtPeriodEnd?: boolean;
}
```

**Response:** `200 OK`

```typescript
SubscriptionResponseDto;
```

---

### Reactivate Subscription

**POST** `/subscriptions/:id/reactivate`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
SubscriptionResponseDto;
```

---

### Suspend Subscription

**POST** `/subscriptions/:id/suspend`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  reason?: string;
}
```

**Response:** `200 OK`

```typescript
SubscriptionResponseDto;
```

---

### Delete Subscription

**DELETE** `/subscriptions/:id`

**Headers:** `Authorization: Bearer {token}`

**Response:** `204 No Content`

---

### Get Subscription by Stripe ID

**GET** `/subscriptions/stripe/:stripeSubscriptionId`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
SubscriptionResponseDto;
```

---

### Check Upgrade Eligibility

**GET** `/subscriptions/:id/can-upgrade/:targetPlanId`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  canUpgrade: boolean;
  message: string;
  requiresApproval: boolean;
  suggestedActions: string[];
}
```

---

### Check Downgrade Eligibility

**GET** `/subscriptions/:id/can-downgrade/:targetPlanId`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  canDowngrade: boolean;
  message: string;
  requiresApproval: boolean;
  suggestedActions: string[];
}
```

---

### Calculate Proration

**POST** `/subscriptions/:id/calculate-proration`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  newAmount: number;
  effectiveDate?: string;
}
```

**Response:** `200 OK`

```typescript
{
  prorationAmount: number;
  creditAmount: number;
  chargeAmount: number;
}
```

---

### Validate Subscription Limits

**POST** `/subscriptions/:id/validate-limits`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  usageData: Record<string, number>;
}
```

**Response:** `200 OK`

```typescript
{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

---

### Health Check

**GET** `/subscriptions/health`

**Response:** `200 OK`

```typescript
{
  status: string;
  timestamp: string;
}
```

---

## Usage Tracking

### Record Usage

**POST** `/subscriptions/usage/record`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  subscriptionId: string;
  metricName: string;
  value: number;
  periodStart: string;
  periodEnd: string;
  metadata?: Record<string, any>;
}
```

**Response:** `201 Created`

```typescript
{
  success: boolean;
  usage: UsageRecord;
  alerts: Array<UsageAlertResponseDto>;
}
```

---

### Bulk Record Usage

**POST** `/subscriptions/usage/bulk-record`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  usageRecords: Array<{
    subscriptionId: string;
    metricName: string;
    value: number;
    periodStart: string;
    periodEnd: string;
  }>;
}
```

**Response:** `201 Created`

```typescript
{
  success: boolean;
  usageRecords: UsageRecord[];
  alerts: Array<UsageAlertResponseDto>;
}
```

---

### Get Current Usage

**GET** `/subscriptions/usage/:subscriptionId/current`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  usage: Record<string, number>;
}
```

---

### Get Usage Limits

**GET** `/subscriptions/usage/:subscriptionId/limits`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  limits: Array<{
    metricName: string;
    limit: number;
    currentUsage: number;
    percentage: number;
  }>;
}
```

---

### Check Usage Alerts

**GET** `/subscriptions/usage/:subscriptionId/alerts`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  alerts: Array<{
    metricName: string;
    severity: 'warning' | 'critical';
    message: string;
    currentUsage: number;
    limit: number;
  }>;
}
```

---

### Get Usage Analytics

**GET** `/subscriptions/usage/:subscriptionId/analytics?startDate={date}&endDate={date}`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  analytics: {
    totalUsage: Record<string, number>;
    averageUsage: Record<string, number>;
    peakUsage: Record<string, number>;
    trends: Array<{
      date: string;
      usage: Record<string, number>;
    }>;
  }
}
```

---

### Get Usage History

**GET** `/subscriptions/usage/:subscriptionId/history?metricName={name}&startDate={date}&endDate={date}&limit={limit}`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  history: Array<UsageRecord>;
}
```

---

### Get Tenant Usage Summary

**GET** `/subscriptions/usage/tenant/summary?startDate={date}&endDate={date}`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  summary: {
    totalUsage: Record<string, number>;
    subscriptionUsage: Array<{
      subscriptionId: string;
      usage: Record<string, number>;
    }>;
    period: {
      startDate: string;
      endDate: string;
    }
  }
}
```

---

## Billing Portal

### Get Billing Summary

**GET** `/billing/portal/summary`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: {
    currentSubscription: SubscriptionDto;
    upcomingInvoice: InvoiceDto;
    paymentMethod: PaymentMethodDto;
    billingHistory: Array<InvoiceDto>;
    usageSummary: UsageSummaryDto;
  }
}
```

---

### Get Customer Invoices

**GET** `/billing/portal/invoices?page=1&limit=10&status={status}`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: {
    invoices: Array<InvoiceDto>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }
}
```

---

### Get Invoice Download URL

**GET** `/billing/portal/invoices/:invoiceId/download`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: {
    downloadUrl: string;
    expiresAt: string;
  }
}
```

---

### Get Customer Subscriptions

**GET** `/billing/portal/subscriptions`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: Array<SubscriptionDto>;
}
```

---

### Cancel Subscription

**POST** `/billing/portal/subscriptions/:subscriptionId/cancel`

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

```typescript
{
  reason?: string;
}
```

**Response:** `200 OK`

```typescript
{
  success: boolean;
  message: string;
}
```

---

### Reactivate Subscription

**POST** `/billing/portal/subscriptions/:subscriptionId/reactivate`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  message: string;
}
```

---

### Get Customer Payment Methods

**GET** `/billing/portal/payment-methods`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  data: Array<PaymentMethodDto>;
}
```

---

### Set Default Payment Method

**PUT** `/billing/portal/payment-methods/:paymentMethodId/default`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  message: string;
}
```

---

### Delete Payment Method

**DELETE** `/billing/portal/payment-methods/:paymentMethodId`

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`

```typescript
{
  success: boolean;
  message: string;
}
```

---

## Best Practices

### 1. Error Handling

Always implement comprehensive error handling:

```typescript
try {
  const response = await fetch(`${API_BASE_URL}/endpoint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    // Handle specific error codes
    switch (response.status) {
      case 401:
        // Redirect to login
        break;
      case 403:
        // Show permission denied message
        break;
      case 429:
        // Handle rate limiting
        break;
      default:
      // Show generic error
    }
    throw new Error(error.message);
  }

  return await response.json();
} catch (error) {
  // Log error and show user-friendly message
  console.error('API Error:', error);
  throw error;
}
```

### 2. Token Refresh

Implement automatic token refresh:

```typescript
async function apiRequest(url: string, options: RequestInit = {}) {
  let token = localStorage.getItem('accessToken');

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Try to refresh token
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      const newToken = await refreshAccessToken(refreshToken);
      // Retry request with new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
    } else {
      // Redirect to login
      window.location.href = '/login';
    }
  }

  return response;
}
```

### 3. Request Interceptors

Use request interceptors for common headers:

```typescript
// Using Axios example
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }

  return config;
});
```

### 4. Response Caching

Implement appropriate caching strategies:

```typescript
const cache = new Map();

async function getCachedData(
  key: string,
  fetcher: () => Promise<any>,
  ttl = 60000
) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

### 5. Loading States

Always show loading states for async operations:

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

async function fetchData() {
  setLoading(true);
  setError(null);
  try {
    const data = await apiRequest('/endpoint');
    return data;
  } catch (err) {
    setError(err.message);
    throw err;
  } finally {
    setLoading(false);
  }
}
```

### 6. Pagination

Handle pagination consistently:

```typescript
async function fetchPaginatedData(page: number, limit: number) {
  const response = await fetch(
    `${API_BASE_URL}/endpoint?page=${page}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await response.json();

  return {
    items: data.data,
    pagination: {
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.totalPages,
      hasNext: data.hasNextPage,
      hasPrevious: data.hasPreviousPage,
    },
  };
}
```

### 7. File Uploads

Handle file uploads with progress:

```typescript
async function uploadFile(file: File, onProgress?: (progress: number) => void) {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error('Upload failed'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));

    xhr.open('POST', `${API_BASE_URL}/files/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}
```

---

## Support

For additional support or questions about API integration:

- **API Documentation**: `http://localhost:3001/api/docs`
- **Health Check**: `http://localhost:3001/health`

---

**Last Updated:** 2025-01-XX  
**API Version:** 1.0
