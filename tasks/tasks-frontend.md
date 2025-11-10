# Task List: Frontend Implementation for SaaS Boilerplate

Based on PRD: `docs/prd.md` and Backend Implementation: `tasks/tasks-prd.md`

This task list covers frontend implementation for all backend features that have been completed, including Authentication & Security, Multi-Tenant Architecture, User & Team Management, and Payment & Billing Infrastructure.

## Relevant Files

### Frontend (Next.js) Core Files

- `apps/web/src/app/` - Next.js App Router pages and layouts
- `apps/web/src/components/` - React components directory
- `apps/web/src/hooks/` - Custom React hooks
- `apps/web/src/services/` - API service layer
- `apps/web/src/store/` - State management (Zustand/Redux)
- `apps/web/src/utils/` - Utility functions
- `apps/web/src/styles/` - Global styles and TailwindCSS config
- `apps/web/src/types/` - TypeScript type definitions
- `apps/web/src/lib/` - Third-party library configurations
- `apps/web/src/middleware.ts` - Next.js middleware for authentication and routing

### Authentication & Security UI Files

- `apps/web/src/app/(auth)/login/page.tsx` - Login page component
- `apps/web/src/app/(auth)/register/page.tsx` - Registration page component
- `apps/web/src/app/(auth)/forgot-password/page.tsx` - Password reset request page
- `apps/web/src/app/(auth)/reset-password/page.tsx` - Password reset form page
- `apps/web/src/app/(auth)/verify-email/page.tsx` - Email verification page
- `apps/web/src/app/(auth)/mfa/setup/page.tsx` - MFA setup page
- `apps/web/src/app/(auth)/mfa/verify/page.tsx` - MFA verification page
- `apps/web/src/app/(auth)/account-recovery/page.tsx` - Account recovery page
- `apps/web/src/components/auth/login-form.tsx` - Login form component
- `apps/web/src/components/auth/register-form.tsx` - Registration form component
- `apps/web/src/components/auth/mfa-setup-form.tsx` - MFA setup form component
- `apps/web/src/components/auth/mfa-verify-form.tsx` - MFA verification form component
- `apps/web/src/components/auth/session-manager.tsx` - Session management component
- `apps/web/src/hooks/use-auth.ts` - Authentication hook
- `apps/web/src/hooks/use-session.ts` - Session management hook
- `apps/web/src/services/auth.service.ts` - Authentication API service
- `apps/web/src/store/auth.store.ts` - Authentication state management

### Multi-Tenant & User Management UI Files

- `apps/web/src/app/(dashboard)/settings/tenant/page.tsx` - Tenant settings page
- `apps/web/src/app/(dashboard)/settings/tenant/branding/page.tsx` - Tenant branding customization page
- `apps/web/src/app/(dashboard)/settings/tenant/features/page.tsx` - Feature flags management page
- `apps/web/src/app/(dashboard)/settings/profile/page.tsx` - User profile page
- `apps/web/src/app/(dashboard)/settings/profile/avatar/page.tsx` - Avatar upload page
- `apps/web/src/app/(dashboard)/users/page.tsx` - Users list page
- `apps/web/src/app/(dashboard)/users/[id]/page.tsx` - User details page
- `apps/web/src/app/(dashboard)/users/import/page.tsx` - Bulk user import page
- `apps/web/src/app/(dashboard)/teams/page.tsx` - Teams list page
- `apps/web/src/app/(dashboard)/teams/[id]/page.tsx` - Team details page
- `apps/web/src/app/(dashboard)/invitations/page.tsx` - Invitations management page
- `apps/web/src/components/tenant/tenant-switcher.tsx` - Tenant switching component
- `apps/web/src/components/tenant/branding-editor.tsx` - Branding customization component
- `apps/web/src/components/users/user-list.tsx` - Users list component
- `apps/web/src/components/users/user-form.tsx` - User create/edit form
- `apps/web/src/components/users/bulk-import.tsx` - Bulk import component
- `apps/web/src/components/teams/team-list.tsx` - Teams list component
- `apps/web/src/components/teams/team-form.tsx` - Team create/edit form
- `apps/web/src/components/invitations/invitation-list.tsx` - Invitations list component
- `apps/web/src/components/invitations/invitation-form.tsx` - Invitation creation form
- `apps/web/src/hooks/use-tenant.ts` - Tenant management hook
- `apps/web/src/hooks/use-users.ts` - Users management hook
- `apps/web/src/hooks/use-teams.ts` - Teams management hook
- `apps/web/src/services/tenant.service.ts` - Tenant API service
- `apps/web/src/services/users.service.ts` - Users API service
- `apps/web/src/services/teams.service.ts` - Teams API service

### Payment & Billing UI Files

- `apps/web/src/app/(dashboard)/billing/page.tsx` - Billing dashboard page
- `apps/web/src/app/(dashboard)/billing/subscriptions/page.tsx` - Subscriptions management page
- `apps/web/src/app/(dashboard)/billing/payment-methods/page.tsx` - Payment methods page
- `apps/web/src/app/(dashboard)/billing/invoices/page.tsx` - Invoices list page
- `apps/web/src/app/(dashboard)/billing/invoices/[id]/page.tsx` - Invoice details page
- `apps/web/src/app/(dashboard)/billing/analytics/page.tsx` - Revenue analytics dashboard
- `apps/web/src/app/(dashboard)/billing/taxes/page.tsx` - Tax management page
- `apps/web/src/components/billing/subscription-card.tsx` - Subscription card component
- `apps/web/src/components/billing/payment-method-form.tsx` - Payment method form component
- `apps/web/src/components/billing/invoice-list.tsx` - Invoices list component
- `apps/web/src/components/billing/invoice-viewer.tsx` - Invoice PDF viewer component
- `apps/web/src/components/billing/analytics-dashboard.tsx` - Analytics dashboard component
- `apps/web/src/components/billing/mrr-chart.tsx` - MRR chart component
- `apps/web/src/components/billing/churn-chart.tsx` - Churn analytics chart
- `apps/web/src/components/billing/growth-chart.tsx` - Growth metrics chart
- `apps/web/src/components/billing/tax-calculator.tsx` - Tax calculation component
- `apps/web/src/hooks/use-billing.ts` - Billing management hook
- `apps/web/src/hooks/use-subscriptions.ts` - Subscriptions hook
- `apps/web/src/services/billing.service.ts` - Billing API service
- `apps/web/src/services/subscriptions.service.ts` - Subscriptions API service

### Landing Page Files

- `apps/web/src/app/page.tsx` - Main landing page component
- `apps/web/src/components/landing/hero-section.tsx` - Hero section with value proposition
- `apps/web/src/components/landing/tech-stack-section.tsx` - Technology stack showcase
- `apps/web/src/components/landing/features-section.tsx` - Main features showcase
- `apps/web/src/components/landing/feature-card.tsx` - Individual feature card component
- `apps/web/src/components/landing/auth-features.tsx` - Authentication features showcase
- `apps/web/src/components/landing/billing-features.tsx` - Payment & billing features
- `apps/web/src/components/landing/tenant-features.tsx` - Multi-tenant features
- `apps/web/src/components/landing/dev-experience.tsx` - Developer experience showcase
- `apps/web/src/components/landing/testimonials-section.tsx` - Social proof section
- `apps/web/src/components/landing/testimonial-card.tsx` - Individual testimonial component
- `apps/web/src/components/landing/showcase-section.tsx` - Customer projects showcase
- `apps/web/src/components/landing/showcase-card.tsx` - Individual showcase project card
- `apps/web/src/components/landing/pricing-section.tsx` - Pricing plans section
- `apps/web/src/components/landing/pricing-card.tsx` - Individual pricing plan card
- `apps/web/src/components/landing/faq-section.tsx` - FAQ accordion section
- `apps/web/src/components/landing/faq-item.tsx` - Individual FAQ accordion item
- `apps/web/src/components/landing/newsletter-section.tsx` - Newsletter signup form
- `apps/web/src/components/landing/comparison-table.tsx` - Feature comparison table
- `apps/web/src/components/landing/trust-badges.tsx` - Security and trust indicators
- `apps/web/src/components/landing/benefits-section.tsx` - ROI and benefits showcase
- `apps/web/src/components/landing/cta-section.tsx` - Call-to-action sections
- `apps/web/src/components/landing/navigation.tsx` - Landing page navigation header
- `apps/web/src/components/landing/footer.tsx` - Landing page footer
- `apps/web/src/components/landing/demo-preview.tsx` - Interactive demo or video section
- `apps/web/src/hooks/use-newsletter.ts` - Newsletter subscription hook
- `apps/web/src/services/newsletter.service.ts` - Newsletter API service
- `apps/web/src/types/landing.ts` - Landing page TypeScript types

### Shared UI Components

- `apps/web/src/components/layout/app-layout.tsx` - Main application layout
- `apps/web/src/components/layout/sidebar.tsx` - Sidebar navigation component
- `apps/web/src/components/layout/header.tsx` - Header component with user menu
- `apps/web/src/components/layout/footer.tsx` - Footer component
- `apps/web/src/components/ui/button.tsx` - Button component (shadcn/ui)
- `apps/web/src/components/ui/input.tsx` - Input component (shadcn/ui)
- `apps/web/src/components/ui/form.tsx` - Form component (shadcn/ui)
- `apps/web/src/components/ui/table.tsx` - Table component (shadcn/ui)
- `apps/web/src/components/ui/dialog.tsx` - Dialog component (shadcn/ui)
- `apps/web/src/components/ui/toast.tsx` - Toast notification component
- `apps/web/src/components/ui/loading.tsx` - Loading spinner component
- `apps/web/src/components/ui/error-boundary.tsx` - Error boundary component

### Test Files

- `apps/web/src/**/*.test.tsx` - Component unit tests
- `apps/web/src/**/*.spec.tsx` - Integration tests
- `apps/web/src/**/__tests__/` - Test directories

## Tasks

- [x] 1.0 Frontend Foundation & Core Infrastructure
  - [x] 1.1 Set up Next.js App Router structure with route groups (auth), (dashboard)
  - [x] 1.2 Configure TypeScript paths and environment variables
  - [x] 1.3 Set up TanStack Query (React Query) for server state management
  - [x] 1.4 Configure Zustand for client state management
  - [x] 1.5 Create API client service with axios/fetch and interceptors
  - [x] 1.6 Implement token refresh mechanism and automatic retry logic
  - [x] 1.7 Set up Next.js middleware for authentication and route protection
  - [x] 1.8 Configure React Hook Form with Zod validation schemas
  - [x] 1.9 Set up next-intl for internationalization
  - [x] 1.10 Create error boundary and global error handling
  - [x] 1.11 Set up toast notification system (react-hot-toast or sonner)
  - [x] 1.12 Configure TailwindCSS with design tokens and custom theme
  - [x] 1.13 Install and configure shadcn/ui component library
  - [x] 1.14 Create utility functions for date formatting, currency, and validation
  - [x] 1.15 Set up testing framework (Jest + React Testing Library)

- [x] 2.0 Authentication & Security UI Implementation
  - [x] 2.1 Create authentication store (Zustand) for user state and tokens
  - [x] 2.2 Implement use-auth hook with login, logout, register, and refresh functions
  - [x] 2.3 Create auth service with API integration for all auth endpoints
  - [x] 2.4 Build login page with email/password form and validation
  - [x] 2.5 Build registration page with email verification flow
  - [x] 2.6 Create forgot password page with email submission
  - [x] 2.7 Create reset password page with token validation and new password form
  - [x] 2.8 Build email verification page with resend functionality
  - [x] 2.9 Create MFA setup page with QR code generation and backup codes display
  - [x] 2.10 Build MFA verification page for login and setup confirmation
  - [x] 2.11 Create account recovery page with backup codes management
  - [x] 2.12 Implement session management component showing active devices
  - [x] 2.13 Build device tracking UI with logout capability
  - [x] 2.14 Create protected route wrapper component with role-based access
  - [x] 2.15 Implement permission-based component rendering
  - [x] 2.16 Add loading states and error handling for all auth flows
  - [x] 2.17 Create unit tests for auth components and hooks

- [x] 3.0 Multi-Tenant Architecture & User Management UI
  - [x] 3.1 Create tenant context and store for current tenant state
  - [x] 3.2 Implement use-tenant hook for tenant operations
  - [x] 3.3 Build tenant service with API integration
  - [x] 3.4 Create tenant switcher component with dropdown and search
  - [x] 3.5 Build tenant settings page with general information form
  - [x] 3.6 Create tenant branding editor with logo upload and color picker
  - [x] 3.7 Build feature flags management page with toggle switches
  - [x] 3.8 Create tenant onboarding flow with step-by-step wizard
  - [x] 3.9 Implement user profile page with editable form fields
  - [x] 3.10 Build avatar upload component with image cropping and preview
  - [x] 3.11 Create users list page with search, filters, and pagination
  - [x] 3.12 Build user details page with profile information and activity
  - [x] 3.13 Create user create/edit form with role selection and validation
  - [x] 3.14 Implement bulk user import page with CSV upload and preview
  - [x] 3.15 Build bulk import progress tracker with error display
  - [x] 3.16 Create teams list page with filtering and search
  - [x] 3.17 Build team details page with members list and permissions
  - [x] 3.18 Create team create/edit form with member assignment
  - [x] 3.19 Implement team switching component for multi-team users
  - [x] 3.20 Build invitations list page with status filters
  - [x] 3.21 Create invitation form with email input and role selection
  - [x] 3.22 Implement invitation acceptance flow for new users
  - [x] 3.23 Create access delegation UI for temporary permissions
  - [x] 3.24 Build tenant usage analytics dashboard with charts
  - [ ] 3.25 Add unit tests for tenant and user management components

- [ ] 4.0 Payment & Billing Infrastructure UI
  - [ ] 4.1 Create billing store for subscription and payment state
  - [ ] 4.2 Implement use-billing and use-subscriptions hooks
  - [ ] 4.3 Build billing service with API integration for all billing endpoints
  - [ ] 4.4 Create billing dashboard page with overview cards and quick actions
  - [ ] 4.5 Build subscriptions list page with status filters and search
  - [ ] 4.6 Create subscription card component with plan details and actions
  - [ ] 4.7 Build subscription management page with create, update, cancel flows
  - [ ] 4.8 Implement Stripe Elements integration for payment method forms
  - [ ] 4.9 Create payment methods list page with default method indicator
  - [ ] 4.10 Build payment method form with card input and validation
  - [ ] 4.11 Create invoices list page with filters (status, date range) and pagination
  - [ ] 4.12 Build invoice details page with line items and payment status
  - [ ] 4.13 Implement invoice PDF viewer with download functionality
  - [ ] 4.14 Create revenue analytics dashboard with MRR, churn, and growth metrics
  - [ ] 4.15 Build MRR chart component with trend visualization (recharts or chart.js)
  - [ ] 4.16 Create churn analytics chart with rate trends and reasons breakdown
  - [ ] 4.17 Build growth metrics chart with customer and revenue growth
  - [ ] 4.18 Implement analytics date range picker and currency selector
  - [ ] 4.19 Create tax management page with rate configuration
  - [ ] 4.20 Build tax calculator component with jurisdiction selection
  - [ ] 4.21 Create tax exemption management UI with certificate upload
  - [ ] 4.22 Implement usage-based billing display with meter visualization
  - [ ] 4.23 Build dunning management UI showing failed payment attempts
  - [ ] 4.24 Add loading states and error handling for all billing operations
  - [ ] 4.25 Create unit tests for billing components and hooks

- [x] 5.0 Shared Components & Design System
  - [x] 5.1 Install and configure shadcn/ui base components (button, input, form, etc.)
  - [x] 5.2 Create app layout component with sidebar and header structure
  - [x] 5.3 Build sidebar navigation component with menu items and active state
  - [x] 5.4 Create header component with user menu, notifications, and tenant switcher
  - [x] 5.5 Build footer component with links and copyright information
  - [x] 5.6 Create loading spinner component with different sizes
  - [x] 5.7 Build skeleton loader components for tables and cards
  - [x] 5.8 Implement error boundary component with fallback UI
  - [x] 5.9 Create toast notification component with success, error, warning types
  - [x] 5.10 Build modal/dialog component for confirmations and forms
  - [x] 5.11 Create table component with sorting, filtering, and pagination
  - [x] 5.12 Build form components with validation error display
  - [x] 5.13 Create card component for dashboard widgets
  - [x] 5.14 Build badge component for status indicators
  - [x] 5.15 Implement dropdown menu component with keyboard navigation
  - [x] 5.16 Create tooltip component for help text and descriptions
  - [x] 5.17 Build avatar component with fallback and image loading
  - [x] 5.18 Create empty state component for lists without data
  - [x] 5.19 Implement pagination component with page size selector
  - [x] 5.20 Build search input component with debouncing
  - [x] 5.21 Create date picker component for date range selection
  - [x] 5.22 Build file upload component with drag-and-drop support
  - [x] 5.23 Implement theme provider for dark/light mode switching
  - [x] 5.24 Create responsive navigation for mobile devices
  - [x] 5.25 Add unit tests for all shared UI components

- [ ] 6.0 High-Conversion Landing Page Implementation
  - [x] 6.1 Create landing page layout with header navigation and footer
  - [x] 6.2 Build hero section with value proposition and primary CTA
  - [x] 6.3 Create technology stack showcase section (NestJS, Next.js, TypeScript, etc.)
  - [x] 6.4 Build comprehensive features section highlighting key capabilities
  - [x] 6.5 Create authentication & security features showcase
  - [x] 6.6 Build payment & billing features showcase
  - [x] 6.7 Create multi-tenant architecture features showcase
  - [x] 6.8 Build developer experience and tooling showcase
  - [x] 6.9 Create social proof section with testimonials and trust indicators
  - [x] 6.10 Build customer showcase section with project examples
  - [x] 6.11 Create pricing section with clear value proposition
  - [x] 6.12 Build FAQ section addressing common concerns
  - [x] 6.13 Create newsletter signup section with email capture
  - [x] 6.14 Implement smooth scroll navigation and anchor links
  - [x] 6.15 Add conversion tracking and analytics integration
  - [x] 6.16 Create mobile-responsive design with optimized layouts
  - [x] 6.17 Build interactive demo preview or video section
  - [x] 6.18 Implement A/B testing capabilities for CTAs and headlines
  - [x] 6.19 Add performance optimizations (lazy loading, image optimization)
  - [x] 6.20 Create SEO-optimized meta tags and structured data
  - [x] 6.21 Build comparison table (vs competitors or DIY approach)
  - [x] 6.22 Add trust badges and security certifications display
  - [x] 6.23 Create benefits section highlighting time savings and ROI
  - [x] 6.24 Build interactive feature cards with hover effects
  - [ ] 6.25 Add unit tests for landing page components

### Notes

- **Testing Requirements**: All components must include unit tests using React Testing Library. Maintain minimum 80% code coverage.
- **TypeScript**: Use strict TypeScript configuration. Avoid `any` types. Create proper type definitions for all API responses.
- **State Management**: Use TanStack Query for server state (API data) and Zustand for client state (UI state, user preferences).
- **Form Validation**: Use React Hook Form with Zod schemas for all forms. Display validation errors inline.
- **API Integration**: Create service layer in `src/services/` that wraps API calls. Use custom hooks for data fetching.
- **Error Handling**: Implement consistent error handling with user-friendly error messages. Use toast notifications for feedback.
- **Loading States**: Always show loading states during API calls. Use skeleton loaders for better UX.
- **Responsive Design**: Ensure all components are mobile-responsive. Use TailwindCSS responsive utilities.
- **Accessibility**: Follow WCAG 2.1 AA standards. Use semantic HTML, proper ARIA labels, and keyboard navigation.
- **Performance**: Implement code splitting with React.lazy. Optimize images and use Next.js Image component.
- **Internationalization**: Use next-intl for all user-facing text. Support RTL layouts where applicable.
- **Design System**: Follow shadcn/ui patterns. Maintain consistent spacing, colors, and typography.
- **Authentication**: Protect routes using Next.js middleware. Store tokens securely (httpOnly cookies recommended).
- **Multi-Tenant**: Always include tenant context in API calls. Show tenant switcher in header for multi-tenant users.
- **Charts**: Use recharts or Chart.js for data visualization. Ensure charts are responsive and accessible.
- **File Uploads**: Implement drag-and-drop for file uploads. Show upload progress and handle errors gracefully.
- **Pagination**: Implement server-side pagination for all lists. Include page size selector and page navigation.
- **Search & Filters**: Debounce search inputs. Use URL query parameters for filter state to enable sharing.
- **Dark Mode**: Support dark/light theme switching. Store user preference in localStorage or user profile.
