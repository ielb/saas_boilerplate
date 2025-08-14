#!/bin/bash

# Database Seeding Script Wrapper
# This script runs the database seeding process from the API directory

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}\n"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    log_error "This script must be run from the API directory (apps/api)"
    exit 1
fi

# Check if database is running
log "Checking database connection..."
if ! pg_isready -h localhost -p 5432 -U saas_user > /dev/null 2>&1; then
    log_error "Database is not running. Please start the database first:"
    log "  docker-compose up -d postgres"
    exit 1
fi
log_success "Database is running"

# Check if API dependencies are installed
if [ ! -d "node_modules" ]; then
    log "Installing API dependencies..."
    yarn install
    log_success "Dependencies installed"
fi

# Set environment variables
export DB_HOST=${DB_HOST:-localhost}
export DB_PORT=${DB_PORT:-5432}
export DB_USERNAME=${DB_USERNAME:-saas_user}
export DB_PASSWORD=${DB_PASSWORD:-saas_password}
export DB_DATABASE=${DB_DATABASE:-saas_boilerplate}

log_header "🌱 STARTING DATABASE SEEDING PROCESS"

# Run the seeding script
log "Running database seeding script..."
if yarn db:seed; then
    log_success "Database seeding completed successfully!"
else
    log_error "Database seeding failed!"
    exit 1
fi

log_header "🧪 RUNNING SEEDING VERIFICATION"

# Run the test script
log "Running seeding verification..."
if yarn db:test-seeding; then
    log_success "Seeding verification completed successfully!"
else
    log_error "Seeding verification failed!"
    exit 1
fi

log_header "🎉 SEEDING PROCESS COMPLETED!"

log_success "Your database has been successfully seeded!"
log "You can now start the API server with: yarn start:dev"
log "And test the endpoints with the created users:"
echo ""
log "Test Users:"
log "  superadmin@example.com - SuperAdmin123! (System tenant)"
log "  admin@example.com - Admin123! (Acmac tenant)"
log "  manager@example.com - Manager123! (Acmac tenant)"
log "  member@example.com - Member123! (Acmac tenant)"
log "  viewer@example.com - Viewer123! (Acmac tenant)"
echo ""
log "Quick test command:"
log "  curl -X POST http://localhost:3001/api/auth/login \\"
log "    -H \"Content-Type: application/json\" \\"
log "    -d '{\"email\":\"superadmin@example.com\",\"password\":\"SuperAdmin123!\"}'"
