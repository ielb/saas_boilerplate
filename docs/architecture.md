# Architecture Guide

## Overview

The SaaS Boilerplate Platform is built with a modern, scalable architecture that supports multi-tenancy, real-time features, and enterprise-grade security. This document outlines the system architecture, design patterns, and technical decisions.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │   API Client    │
│   (Next.js)     │    │    (Expo)       │    │   (SDK/REST)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (Nginx)       │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │   (NestJS)      │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   Background    │    │   File Storage  │
│   Gateway       │    │   Jobs (BullMQ) │    │   (S3/GCS)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │   (PostgreSQL)  │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Cache         │
                    │   (Redis)       │
                    └─────────────────┘
```

## Monorepo Structure

### Directory Organization

```
saas-boilerplate/
├── apps/                          # Application packages
│   ├── api/                       # NestJS backend API
│   │   ├── src/
│   │   │   ├── modules/           # Feature modules
│   │   │   │   ├── auth/          # Authentication module
│   │   │   │   ├── users/         # User management
│   │   │   │   ├── tenants/       # Multi-tenant features
│   │   │   │   ├── billing/       # Payment & billing
│   │   │   │   ├── notifications/ # Communication system
│   │   │   │   ├── files/         # File management
│   │   │   │   ├── websocket/     # Real-time features
│   │   │   │   └── admin/         # Administrative features
│   │   │   ├── common/            # Shared utilities
│   │   │   │   ├── decorators/    # Custom decorators
│   │   │   │   ├── guards/        # Authentication guards
│   │   │   │   ├── interceptors/  # Request/response interceptors
│   │   │   │   ├── pipes/         # Validation pipes
│   │   │   │   └── filters/       # Exception filters
│   │   │   ├── config/            # Configuration
│   │   │   ├── database/          # Database setup
│   │   │   └── main.ts            # Application entry point
│   │   └── test/                  # API tests
│   ├── web/                       # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/               # App Router pages
│   │   │   ├── components/        # React components
│   │   │   │   ├── ui/            # Reusable UI components
│   │   │   │   ├── forms/         # Form components
│   │   │   │   └── layout/        # Layout components
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── services/          # API services
│   │   │   ├── store/             # State management
│   │   │   └── utils/             # Utility functions
│   │   └── test/                  # Frontend tests
│   └── mobile/                    # Expo mobile app
│       ├── src/
│       │   ├── app/               # Expo Router pages
│       │   ├── screens/           # Screen components
│       │   ├── components/        # Reusable components
│       │   ├── navigation/        # Navigation setup
│       │   ├── services/          # API and device services
│       │   └── constants/         # App constants
│       └── test/                  # Mobile tests
├── packages/                      # Shared packages
│   ├── shared/                    # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/             # Common TypeScript types
│   │   │   ├── utils/             # Shared utility functions
│   │   │   └── constants/         # Shared constants
│   │   └── test/
│   ├── ui/                        # Shared UI components
│   │   ├── src/
│   │   │   ├── components/        # Reusable UI components
│   │   │   └── stories/           # Storybook stories
│   │   └── test/
│   └── config/                    # Shared configuration
│       ├── src/
│       │   ├── environment.ts     # Environment configuration
│       │   └── index.ts           # Package exports
│       └── test/
├── tools/                         # Build tools and scripts
├── docs/                          # Documentation
├── tasks/                         # Development task lists
├── docker/                        # Docker configurations
└── postman/                       # API testing collections
```

## Design Patterns

### 1. Modular Architecture

Each feature is organized into modules with clear boundaries:

```typescript
// Example module structure
@Module({
  imports: [DatabaseModule, SharedModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
```

### 2. Repository Pattern

Data access is abstracted through repositories:

```typescript
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }
}
```

### 3. Service Layer Pattern

Business logic is encapsulated in services:

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // Business logic here
  }
}
```

### 4. DTO Pattern

Data transfer objects for input validation:

```typescript
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}
```

## Multi-Tenancy Architecture

### Tenant Isolation Strategy

We use a **shared database, separate schemas** approach:

```sql
-- Each tenant gets its own schema
CREATE SCHEMA tenant_123;
CREATE SCHEMA tenant_456;

-- Tables are created in each schema
CREATE TABLE tenant_123.users (...);
CREATE TABLE tenant_456.users (...);
```

### Tenant Context

Tenant information is passed through the request context:

```typescript
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];

    // Set tenant context
    TenantContext.setTenantId(tenantId);

    return next.handle();
  }
}
```

### Database Queries

All database queries are automatically scoped to the current tenant:

```typescript
@Injectable()
export class UserRepository {
  async findAll(): Promise<User[]> {
    const tenantId = TenantContext.getTenantId();
    return this.userRepository.find({
      where: { tenantId },
    });
  }
}
```

## Security Architecture

### Authentication Flow

1. **Login**: User provides credentials
2. **Validation**: Credentials are validated against database
3. **Token Generation**: JWT access token and refresh token are generated
4. **Response**: Tokens are returned to client
5. **Storage**: Client stores tokens securely
6. **Usage**: Access token is sent with each API request

### Authorization

Role-based access control with hierarchical permissions:

```typescript
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

@Injectable()
export class RoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler()
    );
    const user = context.switchToHttp().getRequest().user;

    return requiredRoles.some(role => user.roles.includes(role));
  }
}
```

### Data Protection

- **Encryption at Rest**: Database fields are encrypted using AES-256
- **Encryption in Transit**: TLS 1.3 for all communications
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Prevention**: Parameterized queries with TypeORM
- **XSS Prevention**: Content Security Policy headers

## Real-Time Architecture

### WebSocket Infrastructure

```typescript
@WebSocketGateway({
  namespace: 'notifications',
  cors: true,
})
export class NotificationGateway {
  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string): void {
    client.join(room);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(client: Socket, payload: MessageDto): void {
    // Broadcast to room
    this.server.to(payload.room).emit('newMessage', payload);
  }
}
```

### Message Queuing

Background jobs are processed using BullMQ:

```typescript
@Injectable()
export class EmailQueue {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async addEmailJob(emailData: EmailJobData): Promise<void> {
    await this.emailQueue.add('send-email', emailData, {
      attempts: 3,
      backoff: 'exponential',
    });
  }
}
```

## Performance Architecture

### Caching Strategy

Multi-layer caching approach:

1. **Application Cache**: In-memory cache for frequently accessed data
2. **Redis Cache**: Distributed cache for shared data
3. **CDN Cache**: Static assets and API responses
4. **Database Cache**: Query result caching

### Database Optimization

- **Connection Pooling**: Configurable connection pools
- **Query Optimization**: Indexed queries and efficient joins
- **Read Replicas**: Separate read and write databases
- **Sharding**: Horizontal partitioning for large datasets

### API Performance

- **Rate Limiting**: Configurable limits per user/tenant
- **Response Caching**: Cache frequently requested data
- **Compression**: Gzip compression for responses
- **Pagination**: Efficient pagination for large datasets

## Monitoring & Observability

### Health Checks

```typescript
@Controller('health')
export class HealthController {
  @Get()
  async check(): Promise<HealthCheckResult> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        email: await this.checkEmailService(),
      },
    };
  }
}
```

### Logging

Structured logging with multiple levels:

```typescript
@Injectable()
export class LoggerService {
  private logger = new Logger(LoggerService.name);

  log(message: string, context?: string): void {
    this.logger.log(message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, trace, context);
  }
}
```

### Metrics

Application metrics using Prometheus:

```typescript
@Injectable()
export class MetricsService {
  private requestCounter = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
  });

  incrementRequest(method: string, route: string, status: number): void {
    this.requestCounter.inc({ method, route, status });
  }
}
```

## Deployment Architecture

### Container Strategy

- **Multi-stage builds** for optimized production images
- **Non-root users** for security
- **Health checks** for container monitoring
- **Resource limits** for stability

### Environment Management

- **Environment-specific configurations**
- **Secrets management** with external providers
- **Configuration validation** at startup
- **Feature flags** for gradual rollouts

### Scaling Strategy

- **Horizontal scaling** with load balancers
- **Auto-scaling** based on metrics
- **Database scaling** with read replicas
- **Cache scaling** with Redis clusters

## Development Workflow

### Code Quality

- **TypeScript strict mode** for type safety
- **ESLint and Prettier** for code formatting
- **Pre-commit hooks** for quality gates
- **Conventional commits** for version control

### Testing Strategy

- **Unit tests** for business logic
- **Integration tests** for API endpoints
- **E2E tests** for user workflows
- **Performance tests** for load testing

### CI/CD Pipeline

1. **Code Quality**: Linting and formatting checks
2. **Testing**: Unit, integration, and E2E tests
3. **Security**: Vulnerability scanning
4. **Build**: Docker image creation
5. **Deploy**: Staging and production deployment

## Conclusion

This architecture provides a solid foundation for building scalable, secure, and maintainable SaaS applications. The modular design allows for easy extension and modification while maintaining clear separation of concerns and following industry best practices.
