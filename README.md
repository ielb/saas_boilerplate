# 🚀 Full-Stack SaaS Boilerplate Platform

A comprehensive, production-ready SaaS boilerplate template that combines NestJS backend architecture with Next.js frontend capabilities. This platform serves as a foundational template enabling rapid development of multi-tenant SaaS applications with enterprise-grade features.

## ✨ Features

### 🔐 Authentication & Security

- **Multi-factor Authentication**: TOTP-based 2FA with backup codes
- **JWT Token Management**: Access tokens (15min) and refresh tokens (7 days)
- **Session Management**: Device tracking with forced logout capability
- **Password Security**: Argon2 hashing with complexity requirements
- **Role-Based Access Control**: Hierarchical permission system
- **API Rate Limiting**: Configurable limits per user/tenant/endpoint

### 🏢 Multi-Tenant Architecture

- **Tenant Isolation**: Shared database with tenant-scoped queries
- **Tenant Onboarding**: Automated setup with customizable workflows
- **Data Segregation**: Complete logical separation of tenant data
- **Branding Customization**: Logo, colors, and domain customization
- **Feature Flags**: Per-tenant feature enablement

### 💳 Payment & Billing

- **Stripe Integration**: Subscription management and payment processing
- **Invoice Generation**: PDF invoices with customizable templates
- **Usage-Based Billing**: Metered billing for API calls or storage
- **Tax Calculation**: Automated tax computation for global compliance

### 📧 Communication System

- **Multi-Provider Email**: SMTP, AWS SES, SendGrid, and Postmark support
- **Template Engine**: MJML and Handlebars with preview capability
- **Multi-Channel Notifications**: Email, in-app, SMS, and push notifications
- **Real-Time Delivery**: WebSocket-based instant notifications

### 📁 File Management

- **Cloud Storage**: AWS S3, Google Cloud Storage, and local storage
- **Security Features**: Virus scanning and file type validation
- **Document Processing**: PDF generation, Excel operations, image processing
- **Version Control**: File versioning with rollback capability

## 🏗️ Architecture

### Backend (NestJS)

- **Runtime**: Node.js with TypeScript
- **Framework**: NestJS with modular architecture
- **Database**: PostgreSQL (primary), MongoDB (alternative)
- **Caching**: Redis with clustering support
- **Queue Management**: BullMQ for background processing
- **API Documentation**: OpenAPI/Swagger integration

### Frontend (Next.js)

- **Framework**: Next.js 14+ with App Router
- **UI Library**: React 18+ with TypeScript
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Internationalization**: next-intl

### Mobile (Expo)

- **Framework**: Expo SDK 50+ with TypeScript
- **Navigation**: React Navigation v6+
- **State Management**: Zustand
- **Device Features**: Camera, location, notifications, contacts

### Infrastructure & DevOps

- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for development
- **CI/CD**: GitHub Actions with automated testing
- **Cloud Storage**: AWS S3 with CDN integration
- **Monitoring**: Health checks and logging systems

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Yarn 4+
- Docker & Docker Compose
- PostgreSQL
- Redis

### Setup Scripts

We provide convenient setup scripts to get you started quickly:

```bash
# ⭐ RECOMMENDED: Complete tenant setup (permissions, roles, users)
./scripts/setup-tenant.sh

# Test your API setup first
./scripts/test-api.sh

# Start Adminer for database management
./scripts/start-adminer.sh
# Access at: http://localhost:8081
```

**Configuration:**
Edit `scripts/config.sh` to match your local API and database setup.

**Generated Test Accounts:**

#### 🔴 SuperAdmin (Level 1 - Full System Access)

- **Email**: `superadmin@example.com`
- **Password**: `SuperAdmin123!`
- **Permissions**: ALL permissions (full system access)
- **Role**: SuperAdmin
- **Features**:
  - Automatically gets all available permissions
  - Can manage all resources across all tenants
  - Has global system administration capabilities
  - Can update permissions dynamically

#### 🟡 Admin (Level 2 - Administrative Access)

- **Email**: `admin@example.com`
- **Password**: `Admin123!`
- **Permissions**: All except system_settings (tenant management)
- **Role**: Admin

#### 🟠 Manager (Level 3 - Team Management)

- **Email**: `manager@example.com`
- **Password**: `Manager123!`
- **Permissions**: Team management, user management, content management
- **Role**: Manager

#### 🟢 User (Level 4 - Basic Access)

- **Email**: `user@example.com`
- **Password**: `User123!`
- **Permissions**: Basic file operations, notifications, user read
- **Role**: User

#### 🔵 Viewer (Level 5 - Read-Only Access)

- **Email**: `viewer@example.com`
- **Password**: `Viewer123!`
- **Permissions**: Read-only access (users, files, notifications)
- **Role**: Viewer

### Permission Hierarchy

```
SuperAdmin > Admin > Manager > User > Viewer
```

### Quick Login Commands

You can test the accounts using curl:

```bash
# SuperAdmin login
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"SuperAdmin123!"}'

# Admin login
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'

# User login
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"User123!"}'
```

⚠️ **Note**: These are test accounts. Change passwords in production!
💡 **Tip**: Use these accounts to test different permission levels and RBAC functionality!

### 🔐 Super Admin Permissions Management

The Super Admin role automatically gets **ALL available permissions** in the system. This ensures complete system access for administration purposes.

#### Automatic Permission Assignment

- **On Registration**: When a new tenant is created, Super Admin automatically gets all permissions
- **On Permission Creation**: New permissions are automatically assigned to Super Admin
- **Dynamic Updates**: Super Admin permissions are updated when new features are added

#### Manual Permission Management

You can manually update Super Admin permissions using the provided script:

```bash
# Update Super Admin permissions
./scripts/update-super-admin-permissions.sh
```

#### API Endpoints for Super Admin Management

```bash
# Update Super Admin permissions
curl -X POST "http://localhost:3001/api/roles/super-admin/update-permissions"

# Get Super Admin permissions
curl -X GET "http://localhost:3001/api/roles/super-admin/permissions"

# Create default roles (includes Super Admin)
curl -X POST "http://localhost:3001/api/roles/default"
```

#### Super Admin Permissions Include

- **User Management**: All CRUD operations on users
- **Role Management**: All role and permission operations
- **Tenant Management**: Full tenant administration
- **System Settings**: Global system configuration
- **Billing & Subscriptions**: Complete billing management
- **File Management**: All file operations
- **Analytics & Reports**: Full reporting access
- **Audit Logs**: Complete audit trail access
- **Feature Flags**: System feature management
- **API Keys**: API key management
- **Webhooks**: Webhook configuration

See [scripts/README.md](scripts/README.md) for detailed documentation.

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ielb/saas_boilerplate.git
   cd saas_boilerplate
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development environment**

   ```bash
   # Start all services with Docker Compose
   docker-compose up -d

   # Or start individual services
   yarn workspace @app/api dev
   yarn workspace @app/web dev
   yarn workspace @app/mobile start
   ```

5. **Access the applications**
   - **API**: http://localhost:3001/api
   - **API Docs**: http://localhost:3001/api/docs
   - **Web App**: http://localhost:3000
   - **Mobile**: Expo Go app

6. **Development Tools**
   - **Adminer (Database Management)**: http://localhost:8080
     - Server: `postgres`
     - Username: `saas_user`
     - Password: `saas_password`
     - Database: `saas_boilerplate`
   - **Mailhog (Email Testing)**: http://localhost:8025
   - **MinIO Console (File Storage)**: http://localhost:9001
     - Username: `minioadmin`
     - Password: `minioadmin123`

## 📁 Project Structure

```
saas_boilerplate/
├── apps/
│   ├── api/                 # NestJS backend
│   ├── web/                 # Next.js frontend
│   └── mobile/              # Expo mobile app
├── packages/
│   ├── shared/              # Shared types and utilities
│   ├── ui/                  # Shared UI components
│   └── config/              # Shared configuration
├── docker/                  # Docker configurations
├── docs/                    # Documentation
├── scripts/                 # Setup scripts (setup-tenant.sh, test-api.sh, etc.)
├── tasks/                   # Task tracking
└── tools/                   # Build tools and scripts
```

## 🧪 Testing

### Backend Testing

```bash
# Unit tests
yarn workspace @app/api test

# E2E tests
yarn workspace @app/api test:e2e

# Test coverage
yarn workspace @app/api test:cov
```

### Frontend Testing

```bash
# Unit tests
yarn workspace @app/web test

# E2E tests
yarn workspace @app/web test:e2e
```

### Mobile Testing

```bash
# Unit tests
yarn workspace @app/mobile test

# E2E tests with Detox
yarn workspace @app/mobile test:e2e
```

## 🚀 Deployment

### Development

```bash
docker-compose up -d
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Optional: Start Adminer in Production**

```bash
# Start Adminer with other services
docker-compose -f docker-compose.prod.yml --profile adminer up -d

# Access Adminer at: http://localhost:8081
# Use the same database credentials as configured in your environment
```

### Environment Variables

See `.env.example` for all required environment variables.

## 📚 Documentation

- [Architecture Guide](docs/architecture.md)
- [Product Requirements](docs/prd.md)
- [Task Tracking](tasks/tasks-prd.md)
- [API Documentation](http://localhost:3001/api/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/ielb/saas_boilerplate/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ielb/saas_boilerplate/discussions)
- **Documentation**: [Wiki](https://github.com/ielb/saas_boilerplate/wiki)

## 🎯 Roadmap

### Phase 1: Foundation ✅

- [x] Project setup and core architecture
- [x] Authentication and authorization system
- [x] Basic user management
- [x] Database schema and migrations

### Phase 2: Core Features 🚧

- [ ] Multi-tenant architecture implementation
- [ ] Payment and billing integration
- [ ] Email system with multiple providers
- [ ] File upload and storage system

### Phase 3: Advanced Features 📋

- [ ] Real-time capabilities and WebSocket infrastructure
- [ ] Notification system across all channels
- [ ] Administrative features and audit logging
- [ ] PDF and Excel processing capabilities

### Phase 4: Polish & Launch 📋

- [ ] Comprehensive testing and security audit
- [ ] Performance optimization and monitoring setup
- [ ] Documentation and developer guides
- [ ] CI/CD pipeline and deployment automation

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ielb/saas_boilerplate&type=Date)](https://star-history.com/#ielb/saas_boilerplate&Date)

---

**Built with ❤️ by [Issam Elbouhati](https://github.com/ielb)**
