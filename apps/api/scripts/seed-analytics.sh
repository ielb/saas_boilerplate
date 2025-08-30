#!/bin/bash

# Analytics Data Seeding Script
# This script seeds the database with comprehensive analytics test data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the apps/api directory"
    exit 1
fi

# Check if database is running
print_header "Checking Database Connection"

if ! docker exec saas-postgres pg_isready -U saas_user -d saas_boilerplate > /dev/null 2>&1; then
    print_error "Database is not running. Please start the database first:"
    echo "docker-compose up -d postgres"
    exit 1
fi

print_success "Database is running"

# Check if main seeding has been run
print_header "Checking Prerequisites"

TENANT_COUNT=$(docker exec saas-postgres psql -U saas_user -d saas_boilerplate -t -c "SELECT COUNT(*) FROM tenants;" | tr -d ' ')
USER_COUNT=$(docker exec saas-postgres psql -U saas_user -d saas_boilerplate -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')

if [ "$TENANT_COUNT" -eq 0 ]; then
    print_error "No tenants found. Please run the main seeding script first:"
    echo "npx ts-node scripts/seed-database.ts"
    exit 1
fi

if [ "$USER_COUNT" -eq 0 ]; then
    print_error "No users found. Please run the main seeding script first:"
    echo "npx ts-node scripts/seed-database.ts"
    exit 1
fi

print_success "Found $TENANT_COUNT tenants and $USER_COUNT users"

# Run analytics seeding
print_header "Running Analytics Seeding"

if npx ts-node scripts/seed-analytics.ts; then
    print_success "Analytics seeding completed successfully!"
else
    print_error "Analytics seeding failed"
    exit 1
fi

# Verify the seeding
print_header "Verifying Analytics Data"

ANALYTICS_EVENTS=$(docker exec saas-postgres psql -U saas_user -d saas_boilerplate -t -c "SELECT COUNT(*) FROM usage_analytics;" | tr -d ' ')
ANALYTICS_AGGREGATES=$(docker exec saas-postgres psql -U saas_user -d saas_boilerplate -t -c "SELECT COUNT(*) FROM analytics_aggregates;" | tr -d ' ')
ANALYTICS_ALERTS=$(docker exec saas-postgres psql -U saas_user -d saas_boilerplate -t -c "SELECT COUNT(*) FROM analytics_alerts;" | tr -d ' ')
ANALYTICS_REPORTS=$(docker exec saas-postgres psql -U saas_user -d saas_boilerplate -t -c "SELECT COUNT(*) FROM analytics_reports;" | tr -d ' ')

print_success "Analytics Events: $ANALYTICS_EVENTS"
print_success "Analytics Aggregates: $ANALYTICS_AGGREGATES"
print_success "Analytics Alerts: $ANALYTICS_ALERTS"
print_success "Analytics Reports: $ANALYTICS_REPORTS"

# Show sample data
print_header "Sample Analytics Data"

echo -e "${YELLOW}Sample Events:${NC}"
docker exec saas-postgres psql -U saas_user -d saas_boilerplate -c "SELECT \"eventType\", \"eventName\", \"timestamp\" FROM usage_analytics ORDER BY \"timestamp\" DESC LIMIT 5;"

echo -e "\n${YELLOW}Sample Aggregates:${NC}"
docker exec saas-postgres psql -U saas_user -d saas_boilerplate -c "SELECT \"metricName\", \"period\", \"totalValue\", \"count\" FROM analytics_aggregates ORDER BY \"timestamp\" DESC LIMIT 5;"

echo -e "\n${YELLOW}Sample Alerts:${NC}"
docker exec saas-postgres psql -U saas_user -d saas_boilerplate -c "SELECT \"alertName\", \"severity\", \"metricName\", \"threshold\" FROM analytics_alerts LIMIT 5;"

echo -e "\n${YELLOW}Sample Reports:${NC}"
docker exec saas-postgres psql -U saas_user -d saas_boilerplate -c "SELECT \"reportName\", \"status\", \"format\" FROM analytics_reports LIMIT 5;"

print_header "Analytics Seeding Complete!"

print_success "You can now test the analytics endpoints with the seeded data"
print_success "Use the test users created by the main seeding script to access the analytics"

echo -e "\n${YELLOW}Test Users:${NC}"
echo "superadmin@example.com / SuperAdmin123!"
echo "admin@example.com / Admin123!"
echo "manager@example.com / Manager123!"
echo "member@example.com / Member123!"
echo "viewer@example.com / Viewer123!"

echo -e "\n${YELLOW}Example API Calls:${NC}"
echo "GET /api/analytics/events - Get analytics events"
echo "GET /api/analytics/dashboard - Get analytics dashboard"
echo "GET /api/analytics/summary - Get analytics summary"
echo "GET /api/analytics/alerts - Get analytics alerts"
echo "GET /api/analytics/reports - Get analytics reports"
