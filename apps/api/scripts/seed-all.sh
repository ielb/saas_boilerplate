#!/bin/bash

# Master Database Seeding Script
# This script seeds the entire database with all required data in one go

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}\n"
}

print_step() {
    echo -e "\n${YELLOW}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the apps/api directory"
    exit 1
fi

print_header "🌱 MASTER DATABASE SEEDING SCRIPT"

print_step "This script will seed your database with:"
echo -e "  ${BLUE}•${NC} All permissions and roles"
echo -e "  ${BLUE}•${NC} Test users with different roles"
echo -e "  ${BLUE}•${NC} Tenants (System and Acmac)"
echo -e "  ${BLUE}•${NC} User-tenant memberships"
echo -e "  ${BLUE}•${NC} Subscription plans with Stripe integration"
echo -e "  ${BLUE}•${NC} Complete test data for development"

# Check if required environment variables are set
print_step "Checking environment variables..."

if [ -z "$STRIPE_SECRET_KEY" ]; then
    print_warning "STRIPE_SECRET_KEY not set. Make sure it's in your .env file"
    print_warning "The script will use the value from your .env file if available"
fi

# Check database connectivity
print_step "Checking database connectivity..."

# Try to connect to the database
if ! npx ts-node -e "
import { DataSource } from 'typeorm';
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'saas_user',
  password: process.env.DB_PASSWORD || 'saas_password',
  database: process.env.DB_DATABASE || 'saas_boilerplate',
  synchronize: false,
  logging: false,
});
dataSource.initialize().then(() => {
  console.log('Database connection successful');
  process.exit(0);
}).catch((error) => {
  console.error('Database connection failed:', error.message);
  process.exit(1);
});
" 2>/dev/null; then
    print_error "Failed to connect to database. Please check your database configuration."
    print_error "Make sure PostgreSQL is running and your environment variables are correct."
    exit 1
fi

print_success "Database connection successful"

# Check if Stripe configuration is valid
print_step "Checking Stripe configuration..."

if ! npx ts-node -e "
import { validateStripeConfig } from './src/config/stripe.config';
try {
  validateStripeConfig();
  console.log('Stripe configuration is valid');
  process.exit(0);
} catch (error) {
  console.error('Stripe configuration error:', error.message);
  process.exit(1);
}
" 2>/dev/null; then
    print_error "Stripe configuration is invalid. Please check your STRIPE_SECRET_KEY."
    exit 1
fi

print_success "Stripe configuration is valid"

# Run the master seeding script
print_step "Starting comprehensive database seeding..."

if npx ts-node scripts/seed-all.ts; then
    print_success "Master database seeding completed successfully!"
    
    print_header "🎉 SEEDING COMPLETED SUCCESSFULLY"
    
    print_step "Your database now contains:"
    echo -e "  ${GREEN}•${NC} All RBAC permissions and roles"
    echo -e "  ${GREEN}•${NC} 5 test users with different roles"
    echo -e "  ${GREEN}•${NC} 2 tenants (System and Acmac)"
    echo -e "  ${GREEN}•${NC} User-tenant memberships"
    echo -e "  ${GREEN}•${NC} 4 base subscription plans"
    echo -e "  ${GREEN}•${NC} 12 total plans (including billing variants)"
    echo -e "  ${GREEN}•${NC} Stripe products and prices for each plan"
    
    print_step "Test Users Created:"
    echo -e "  ${CYAN}📧${NC} superadmin@example.com (Super Admin) - System tenant"
    echo -e "  ${CYAN}📧${NC} admin@example.com (Admin) - Acmac tenant"
    echo -e "  ${CYAN}📧${NC} manager@example.com (Manager) - Acmac tenant"
    echo -e "  ${CYAN}📧${NC} member@example.com (Member) - Acmac tenant"
    echo -e "  ${CYAN}📧${NC} viewer@example.com (Viewer) - Acmac tenant"
    
    print_step "Subscription Plans Created:"
    echo -e "  ${MAGENTA}📦${NC} Starter - \$9.99/month (1 user, 3 projects, 5GB)"
    echo -e "  ${MAGENTA}📦${NC} Professional - \$29.99/month (5 users, 15 projects, 50GB) ⭐"
    echo -e "  ${MAGENTA}📦${NC} Business - \$79.99/month (25 users, 50 projects, 200GB)"
    echo -e "  ${MAGENTA}📦${NC} Enterprise - \$199.99/month (100 users, 200 projects, 1TB)"
    echo -e "  ${MAGENTA}📦${NC} Plus quarterly and yearly variants for each plan"
    
    print_step "You can now:"
    echo -e "  ${YELLOW}•${NC} Test all API endpoints with the created users"
    echo -e "  ${YELLOW}•${NC} Use the subscription plans in your Postman collection"
    echo -e "  ${YELLOW}•${NC} Create subscriptions using the seeded plans"
    echo -e "  ${YELLOW}•${NC} Test the complete user journey from login to subscription"
    echo -e "  ${YELLOW}•${NC} Use the plan IDs in your application"
    
    print_step "Quick Test Commands:"
    echo -e "  ${BLUE}# Test login${NC}"
    echo -e "  curl -X POST http://localhost:3001/api/auth/login \\"
    echo -e "    -H \"Content-Type: application/json\" \\"
    echo -e "    -d '{\"email\":\"admin@example.com\",\"password\":\"Admin123!\"}'"
    echo ""
    echo -e "  ${BLUE}# Get subscription plans${NC}"
    echo -e "  curl -X GET http://localhost:3001/api/subscription-plans \\"
    echo -e "    -H \"Authorization: Bearer YOUR_TOKEN\""
    
else
    print_error "Master database seeding failed!"
    exit 1
fi

print_header "✅ MASTER SEEDING COMPLETED SUCCESSFULLY"
