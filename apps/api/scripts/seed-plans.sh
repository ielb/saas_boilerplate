#!/bin/bash

# Subscription Plans Seeding Script
# This script seeds the database with subscription plans integrated with Stripe

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the apps/api directory"
    exit 1
fi

print_header "🌱 SUBSCRIPTION PLANS SEEDING SCRIPT"

# Check if required environment variables are set
print_status "Checking environment variables..."

if [ -z "$STRIPE_SECRET_KEY" ]; then
    print_warning "STRIPE_SECRET_KEY not set. Make sure it's in your .env file"
    print_warning "The script will use the value from your .env file if available"
fi

# Check database connectivity
print_status "Checking database connectivity..."

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
print_status "Checking Stripe configuration..."

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

# Run the seeding script
print_status "Starting subscription plans seeding..."

if npx ts-node scripts/seed-subscription-plans.ts; then
    print_success "Subscription plans seeding completed successfully!"
    
    print_header "🎉 SEEDING COMPLETED"
    print_status "Your database now contains:"
    print_status "  • 4 base subscription plans (Starter, Professional, Business, Enterprise)"
    print_status "  • 12 total plans (including billing cycle variants)"
    print_status "  • Stripe products and prices created for each plan"
    print_status "  • Proper plan features, limits, and restrictions configured"
    
    print_status "\nYou can now:"
    print_status "  • Test the subscription plans API endpoints"
    print_status "  • Create subscriptions using the seeded plans"
    print_status "  • Use the plan IDs in your Postman collection"
    
else
    print_error "Subscription plans seeding failed!"
    exit 1
fi

print_header "✅ SCRIPT COMPLETED SUCCESSFULLY"
