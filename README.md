# SaaS Boilerplate Platform

A comprehensive, production-ready SaaS boilerplate template that combines NestJS backend architecture with Next.js frontend capabilities. Built for rapid development of multi-tenant SaaS applications with enterprise-grade features.

## 🚀 Features

### 🔐 Authentication & Security

- **Multi-factor Authentication** - TOTP-based 2FA with backup codes
- **JWT Token Management** - Access tokens (15min) and refresh tokens (7 days)
- **Session Management** - Device tracking with forced logout capability
- **Password Security** - Argon2 hashing with complexity requirements
- **Role-Based Access Control** - Hierarchical permission system
- **API Rate Limiting** - Configurable limits per user/tenant/endpoint

### 🏢 Multi-Tenant Architecture

- **Tenant Isolation** - Complete data separation between organizations
- **Tenant Onboarding** - Automated setup with customizable workflows
- **Branding Customization** - Logo, colors, and domain customization
- **Feature Flags** - Per-tenant feature enablement
- **Usage Analytics** - Tenant-specific usage tracking and reporting

### 👥 User & Team Management

- **User Lifecycle** - Registration, activation, suspension, deletion
- **Profile Management** - Comprehensive user profiles with avatar upload
- **Team Collaboration** - Role hierarchy with invitation system
- **Bulk Operations** - Import/export users with CSV support
- **Access Delegation** - Temporary permission elevation

### 💳 Payment & Billing

- **Stripe Integration** - Subscription management and payment processing
- **Invoice Generation** - PDF invoices with customizable templates
- **Usage-Based Billing** - Metered billing for API calls or storage
- **Revenue Analytics** - MRR, churn, and growth tracking
- **Dunning Management** - Automated failed payment recovery

### 📧 Communication System

- **Multi-Channel Notifications** - Email, in-app, SMS, and push notifications
- **Email Infrastructure** - SMTP, AWS SES, SendGrid, and Postmark support
- **Template Engine** - MJML and Handlebars with preview capability
- **Delivery Tracking** - Open rates, click tracking, and bounce handling
- **Notification Center** - Persistent in-app notification history

### 📁 File & Document Management

- **Storage Options** - AWS S3, Google Cloud Storage, and local storage
- **Security Features** - Virus scanning and file type validation
- **Document Processing** - PDF generation, Excel operations, image processing
- **Version Control** - File versioning with rollback capability
- **File Organization** - Folder structure with search and tagging

### ⚡ Real-Time Features

- **WebSocket Infrastructure** - Connection management and scaling
- **Room-Based Messaging** - Tenant and team-specific channels
- **Presence System** - Online status and activity indicators
- **Live Features** - Activity feeds, collaborative editing, live chat
- **Message Queuing** - Offline message delivery

### 🛠️ Administrative Features

- **System Monitoring** - Health checks, performance metrics, and alerts
- **Audit Logging** - Comprehensive activity tracking with search
- **User Impersonation** - Secure admin debugging with audit trails
- **Data Management** - Backup, restore, and migration tools
- **Analytics Dashboard** - Usage analytics and business metrics

## 🏗️ Architecture

### Monorepo Structure

```
/
├── apps/
│   ├── api/          # NestJS backend
│   ├── web/          # Next.js frontend
│   └── mobile/       # Expo mobile app
├── packages/
│   ├── shared/       # Shared types and utilities
│   ├── ui/          # Shared UI components
│   └── config/      # Shared configuration
├── tools/           # Build tools and scripts
├── docs/            # Documentation
└── tasks/           # Development task lists
```

### Technology Stack

#### Backend (NestJS)

- **Runtime**: Node.js with TypeScript
- **Framework**: NestJS with modular architecture
- **Database**: PostgreSQL with TypeORM
- **Caching**: Redis with clustering support
- **Queue Management**: BullMQ for background processing
- **API Documentation**: OpenAPI/Swagger integration

#### Frontend (Next.js)

- **Framework**: Next.js 14+ with App Router
- **UI Library**: React 18+ with TypeScript
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Internationalization**: next-intl

#### Mobile (Expo)

- **Framework**: Expo SDK 50+ with TypeScript
- **Navigation**: React Navigation v6+ with Expo Router
- **State Management**: Zustand
- **Device Features**: Camera, location, notifications, contacts
- **Build System**: EAS Build for cloud-based builds

#### Infrastructure

- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for development
- **CI/CD**: GitHub Actions with automated testing
- **Cloud Storage**: AWS S3 with CDN integration
- **Monitoring**: Health checks and logging systems

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- Docker and Docker Compose
- PostgreSQL and Redis (or use Docker)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd saas-boilerplate
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start development environment**

   ```bash
   # Start all services with Docker
   yarn docker:up

   # Or start individual services
   yarn workspace @app/api dev
   yarn workspace @app/web dev
   yarn workspace @app/mobile start
   ```

5. **Access the applications**
   - **API**: http://localhost:3001
   - **Web**: http://localhost:3000
   - **Mobile**: Expo Go app
   - **Mailhog**: http://localhost:8025
   - **MinIO Console**: http://localhost:9001

### Development Workflow

1. **Run tests**

   ```bash
   yarn test              # Run all tests
   yarn test:unit         # Unit tests only
   yarn test:e2e          # End-to-end tests
   yarn test:coverage     # Coverage report
   ```

2. **Code quality**

   ```bash
   yarn lint              # Run ESLint
   yarn lint:fix          # Fix linting issues
   yarn format            # Format code with Prettier
   ```

3. **Build for production**
   ```bash
   yarn build             # Build all applications
   yarn docker:build      # Build Docker images
   ```

## 📚 Documentation

- [API Documentation](./docs/api.md) - Complete API reference
- [Architecture Guide](./docs/architecture.md) - System architecture details
- [Deployment Guide](./docs/deployment.md) - Production deployment instructions
- [Development Guide](./docs/development.md) - Development workflow and guidelines
- [Testing Guide](./docs/testing.md) - Testing strategies and examples
- [Security Guide](./docs/security.md) - Security best practices

## 🧪 Testing

The platform includes comprehensive testing:

- **Unit Tests**: Jest for all services and utilities
- **Integration Tests**: API endpoints with database interactions
- **E2E Tests**: Playwright for web application testing
- **Postman Collections**: API testing with automated workflows
- **Test Coverage**: Minimum 80% coverage requirement

## 🔒 Security

- **Authentication**: JWT with refresh token rotation
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Encryption at rest and in transit
- **Input Validation**: Zod schema validation
- **Rate Limiting**: Configurable API rate limiting
- **Security Headers**: Comprehensive security headers
- **Audit Logging**: Complete activity tracking

## 📊 Monitoring & Analytics

- **Health Checks**: Application and service health monitoring
- **Performance Metrics**: API response times and error rates
- **Business Analytics**: Revenue, growth, and churn tracking
- **Error Tracking**: Sentry integration for error monitoring
- **Logging**: Structured logging with multiple levels

## 🚀 Deployment

### Docker Deployment

```bash
# Production build
docker-compose -f docker-compose.prod.yml up -d

# Environment variables
cp env.example .env.production
# Edit .env.production with production values
```

### Cloud Deployment

- **AWS**: ECS, EKS, or EC2 with RDS and ElastiCache
- **Google Cloud**: GKE with Cloud SQL and Memorystore
- **Azure**: AKS with Azure Database and Redis Cache
- **DigitalOcean**: App Platform with managed databases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build process or auxiliary tool changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@yourdomain.com

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Next.js](https://nextjs.org/) - React framework for production
- [Expo](https://expo.dev/) - React Native development platform
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Stripe](https://stripe.com/) - Payment processing platform
- [PostgreSQL](https://www.postgresql.org/) - Advanced open source database
- [Redis](https://redis.io/) - In-memory data structure store

---

**Built with ❤️ for the developer community**
