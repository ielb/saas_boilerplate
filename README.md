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
