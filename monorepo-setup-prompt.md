# Full-Stack SaaS Boilerplate Monorepo Setup Prompt

Create a comprehensive, production-ready SaaS boilerplate using a monorepo architecture with Yarn workspaces. This template should serve as a foundation for rapid SaaS application development with enterprise-grade features.

## Architecture Overview

Build a full-stack TypeScript monorepo with the following structure:

```
saas-boilerplate/
├── apps/
│   ├── api/          # NestJS backend API
│   ├── web/          # Next.js web application
│   └── mobile/       # Expo mobile application
├── packages/
│   ├── shared/       # Shared types, utilities, and business logic
│   ├── ui/           # Shared UI components library
│   └── config/       # Shared configuration and environment management
├── docker/           # Docker configurations for each service
├── docs/             # Documentation (PRD, architecture, API docs)
├── postman/          # API testing collections and environments
├── scripts/          # Development and deployment scripts
└── tasks/            # Task management and project planning
```

## Technology Stack

### Backend (NestJS API)

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis for session management and caching
- **Authentication**: JWT with refresh tokens, 2FA support
- **File Storage**: AWS S3 compatible (MinIO for local development)
- **Email**: Nodemailer with MJML templates
- **Queue**: Bull Queue with Redis
- **Real-time**: Socket.io for WebSocket connections
- **Payment**: Stripe integration with webhooks
- **Testing**: Jest with comprehensive unit/integration tests
- **Documentation**: Swagger/OpenAPI auto-generation

### Frontend (Next.js Web)

- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state, Zustand for client state
- **Forms**: React Hook Form with Zod validation
- **Internationalization**: next-intl for multi-language support
- **Testing**: React Testing Library with Jest

### Mobile (Expo)

- **Framework**: Expo SDK 50+ with TypeScript
- **Navigation**: React Navigation v6 or Expo Router
- **State Management**: TanStack Query + Zustand
- **Forms**: React Hook Form with Zod validation
- **Device Features**: Camera, location, notifications, secure storage
- **Testing**: React Native Testing Library

### Shared Packages

- **Types**: Shared TypeScript interfaces and types
- **Utilities**: Common helper functions and business logic
- **Validation**: Zod schemas shared across frontend and backend
- **Configuration**: Environment management and app constants

## Core Features to Implement

### 1. Authentication & Authorization

- User registration with email verification
- JWT-based authentication with refresh tokens
- Two-factor authentication (TOTP)
- Password reset functionality
- Role-based access control (RBAC)
- Multi-tenant architecture support
- Social login integration (Google, GitHub)

### 2. User Management

- User profiles with avatar upload
- Account settings and preferences
- Team/organization management
- User invitation system
- Activity logging and audit trails

### 3. Subscription & Billing

- Stripe integration for payments
- Multiple subscription plans
- Usage-based billing support
- Invoice generation and management
- Payment method management
- Webhook handling for payment events
- Tax calculation and compliance

### 4. Multi-Tenancy

- Tenant isolation at database level
- Subdomain-based tenant routing
- Tenant-specific configurations
- Data segregation and security
- Tenant analytics and reporting

### 5. File Management

- Secure file upload/download
- Image processing and optimization
- File sharing with permissions
- Storage quota management
- CDN integration for performance

### 6. Communication

- Email notifications with templates
- In-app messaging system
- Push notifications (mobile)
- Real-time updates via WebSocket
- SMS notifications (optional)

### 7. Analytics & Monitoring

- User behavior tracking
- Performance monitoring
- Error tracking and logging
- Business metrics dashboard
- A/B testing infrastructure

### 8. Admin Dashboard

- User management interface
- System health monitoring
- Analytics and reporting
- Configuration management
- Audit log viewer

## Development Environment Setup

### Prerequisites

- Node.js 18+
- Yarn 4.x (with workspaces)
- Docker & Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker)

### Docker Services

Include the following services in docker-compose.yml:

- PostgreSQL database with health checks
- Redis cache
- MinIO for S3-compatible storage
- MailHog for email testing
- Adminer for database management

### Environment Configuration

Create comprehensive environment management:

- Development, staging, and production configs
- Secure secrets management
- Type-safe environment validation with Zod
- Shared environment variables across apps

## Package Configuration

### Root Package.json

Configure Yarn workspaces with scripts for:

- `yarn dev` - Start all development servers
- `yarn build` - Build all applications
- `yarn test` - Run all tests
- `yarn lint` - Lint all code
- `yarn docker:up` - Start Docker services
- `yarn test:postman` - Run API tests

### TypeScript Configuration

- Strict TypeScript configuration
- Path mapping for workspace packages (@app/_, @shared/_, etc.)
- Consistent compiler options across all packages
- Incremental compilation for faster builds

### Code Quality Tools

- ESLint with TypeScript rules
- Prettier for code formatting
- Husky for Git hooks
- lint-staged for pre-commit checks
- Conventional commits with commitlint

## Database Design

### Core Entities

Design the following database entities:

- Users (with roles and permissions)
- Tenants/Organizations
- Subscriptions and billing
- Files and media
- Audit logs
- Notifications
- Settings and configurations

### Migration Strategy

- TypeORM migrations for schema versioning
- Seed scripts for development data
- Test database setup and cleanup
- Production migration procedures

## API Design

### RESTful Endpoints

Implement comprehensive REST APIs:

- Authentication endpoints (/auth/\*)
- User management (/users/\*)
- Tenant management (/tenants/\*)
- Billing operations (/billing/\*)
- File operations (/files/\*)
- Admin operations (/admin/\*)

### API Standards

- OpenAPI/Swagger documentation
- Consistent response formats
- Proper HTTP status codes
- Request/response validation with DTOs
- Rate limiting and throttling
- API versioning strategy

## Testing Strategy

### Backend Testing

- Unit tests for all services and controllers
- Integration tests for database operations
- End-to-end tests for critical user flows
- Postman collections for API testing
- Test coverage requirements (80%+)

### Frontend Testing

- Component testing with React Testing Library
- Integration tests for user workflows
- Visual regression testing
- Accessibility testing
- Performance testing

### Mobile Testing

- React Native Testing Library
- Device feature testing
- Platform-specific testing (iOS/Android)
- Expo testing utilities

## Security Implementation

### Security Features

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Helmet.js security headers
- Content Security Policy
- Secure session management

### Data Protection

- Encryption at rest and in transit
- PII data handling
- GDPR compliance features
- Data retention policies
- Secure file storage

## Performance Optimization

### Backend Performance

- Database query optimization
- Caching strategies with Redis
- Background job processing
- API response compression
- Connection pooling

### Frontend Performance

- Code splitting and lazy loading
- Image optimization
- CDN integration
- Bundle size optimization
- Core Web Vitals optimization

## Deployment & DevOps

### Containerization

- Multi-stage Docker builds
- Development and production images
- Docker Compose for local development
- Health checks and monitoring

### CI/CD Pipeline

- GitHub Actions workflows
- Automated testing
- Security scanning
- Deployment automation
- Environment promotion

### Monitoring & Logging

- Application performance monitoring
- Error tracking
- Log aggregation
- Health check endpoints
- Alerting system

## Documentation Requirements

### Technical Documentation

- README files for each package
- API documentation with Swagger
- Architecture decision records
- Setup and deployment guides
- Troubleshooting guides

### Developer Experience

- Code examples and tutorials
- Development workflow documentation
- Contributing guidelines
- Code style guides
- Testing best practices

## File Structure Details

Create the exact file structure with:

- Proper package.json for each workspace
- TypeScript configurations with path mapping
- ESLint and Prettier configurations
- Docker files for each service
- Environment files and examples
- Database migration files
- Seed scripts for development data

## Quality Standards

### Code Quality

- TypeScript strict mode
- 100% type coverage
- Comprehensive error handling
- Consistent naming conventions
- SOLID principles adherence

### Testing Requirements

- Minimum 80% code coverage
- All API endpoints tested
- Critical user flows covered
- Performance benchmarks
- Security testing

### Performance Targets

- API response times <200ms
- Page load times <2 seconds
- Database queries optimized
- Memory usage monitoring
- Scalability for 10,000+ users

## Getting Started Instructions

Provide step-by-step setup instructions:

1. Clone and install dependencies
2. Start Docker services
3. Run database migrations
4. Seed development data
5. Start development servers
6. Access applications and admin interfaces
7. Run test suites
8. Deploy to staging/production

## Additional Considerations

### Scalability

- Horizontal scaling capabilities
- Database sharding strategies
- CDN integration
- Load balancing
- Microservices migration path

### Internationalization

- Multi-language support
- Currency handling
- Timezone management
- Localized content delivery

### Compliance

- GDPR compliance features
- SOC 2 readiness
- Data export/import capabilities
- Audit trail requirements

---

This prompt should result in a production-ready SaaS boilerplate that can be used as a foundation for building scalable, secure, and maintainable SaaS applications. The monorepo structure enables code sharing, consistent development practices, and efficient deployment strategies across web, mobile, and API applications.



