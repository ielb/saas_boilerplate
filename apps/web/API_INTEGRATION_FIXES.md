# API Integration Fixes

## Overview

Fixed API integration issues to align with the API integration documentation (`docs/api_integration.md`). The main issues were:

1. **Response Structure Mismatch**: Some endpoints return data directly, others wrap in `{ success, data }`
2. **Missing Tenant ID Header**: Multi-tenant requests weren't including `X-Tenant-Id` header
3. **Error Handling**: Error format didn't match NestJS error structure
4. **Next.js Error Visualizer**: Ensured it's properly configured for development

## Changes Made

### 1. API Client (`src/lib/api-client.ts`)

#### Added Tenant ID Support
- Added `getTenantId()` function to retrieve tenant ID from localStorage
- Request interceptor now automatically adds `X-Tenant-Id` header when tenant is available

#### Fixed Response Handling
- Response interceptor now handles both wrapped and unwrapped responses:
  - **Wrapped format**: `{ success: true, data: {...} }` → unwraps to return `data`
  - **Direct format**: `{ accessToken, refreshToken, ... }` → returns as-is
- This matches the API documentation where some endpoints return data directly

#### Improved Error Handling
- Error format now matches NestJS structure: `{ statusCode, message, error, timestamp, path }`
- Handles both string and array message formats
- Better error message extraction from API responses

#### Fixed Token Refresh
- Token refresh now correctly handles direct response format (not wrapped)
- Properly extracts `accessToken` and `refreshToken` from response

### 2. Auth Service (`src/services/auth.service.ts`)

#### Updated Response Types
All methods now correctly reflect the actual API response structure:

- **`login()`**: Returns `LoginResponse` directly (not wrapped)
- **`refreshToken()`**: Returns token data directly
- **`getCurrentUser()`**: Returns `User` directly
- **`setupMfa()`**: Returns `TwoFactorAuthSetup` directly
- **`verifyMfa()`**: Returns `LoginResponse` or validation result directly
- **`getMfaStatus()`**: Returns `TwoFactorAuthStatus` directly

All methods now have comments indicating the actual API response structure.

### 3. Next.js Configuration (`next.config.mjs`)

#### Error Visualizer
- Added `onDemandEntries` configuration to ensure error overlay works properly in development
- Error visualizer is enabled by default in development mode

## API Response Formats

### Direct Response Format (Most Auth Endpoints)
```typescript
// Login, Refresh, MFA endpoints
{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}
```

### Wrapped Response Format (Some Endpoints)
```typescript
// Register, Forgot Password, etc.
{
  success: true;
  data: { message: string };
  message?: string;
}
```

### Error Response Format (NestJS)
```typescript
{
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp?: string;
  path?: string;
}
```

## Tenant Context

The API client now automatically includes the tenant ID header for all requests:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'X-Tenant-Id': tenantId  // Automatically added when available
}
```

The tenant ID is retrieved from the tenant store in localStorage.

## Testing Recommendations

1. **Test Login Flow**: Verify login returns tokens correctly
2. **Test Token Refresh**: Verify automatic token refresh on 401 errors
3. **Test Tenant Switching**: Verify `X-Tenant-Id` header is included
4. **Test Error Handling**: Verify error messages display correctly
5. **Test MFA Flow**: Verify MFA setup and verification work correctly

## Next Steps

- Review other service files to ensure they match API documentation
- Update any components that might be expecting wrapped responses
- Add integration tests for API client interceptors
- Monitor error logs to ensure error handling works correctly

## References

- API Integration Documentation: `docs/api_integration.md`
- API Base URL: Configured via `NEXT_PUBLIC_API_URL` environment variable
- Default: `http://localhost:3001/api`


