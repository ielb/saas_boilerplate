# Environment Variables

This directory contains environment variable configuration for the Next.js application.

## Files

- `env.ts` - Main environment variable configuration with Zod validation
- `env.client.ts` - Client-side utilities (safe to import in client components)
- `env.server.ts` - Server-side utilities (only for server components, API routes, server actions)

## Usage

### Client-Side (Browser)

```typescript
import { getApiUrl, getApiEndpoint } from '@/lib/env.client';

// Get API URL
const apiUrl = getApiUrl(); // http://localhost:3001/api

// Get full endpoint URL
const endpoint = getApiEndpoint('/auth/login'); // http://localhost:3001/api/auth/login
```

### Server-Side

```typescript
import { getApiUrl, getApiEndpoint } from '@/lib/env.server';

// Get API URL
const apiUrl = getApiUrl();

// Get full endpoint URL
const endpoint = getApiEndpoint('/auth/login');
```

### Direct Access

```typescript
// Client-side
import { clientEnv } from '@/lib/env';
const apiUrl = clientEnv.NEXT_PUBLIC_API_URL;

// Server-side
import { serverEnv } from '@/lib/env';
const nodeEnv = serverEnv.NODE_ENV;
```

## Environment Variables

### Client-Side Variables (NEXT_PUBLIC_*)

These variables are exposed to the browser and must be prefixed with `NEXT_PUBLIC_`:

- `NEXT_PUBLIC_API_URL` - API base URL
- `NEXT_PUBLIC_APP_URL` - Application URL
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN for error tracking
- `NEXT_PUBLIC_ENABLE_ANALYTICS` - Enable analytics (true/false)

### Server-Side Variables

These variables are only available on the server:

- `NODE_ENV` - Environment (development, production, test)
- `API_URL` - API base URL
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - JWT secret key
- `JWT_REFRESH_SECRET` - JWT refresh secret key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

## Setup

1. Copy `.env.example` to `.env.local` (or `.env` for development)
2. Fill in the required environment variables
3. Restart the development server

## Validation

All environment variables are validated using Zod schemas. Invalid variables will:
- Show warnings in development mode
- Throw errors in production mode

