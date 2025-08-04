#!/bin/bash

# Configuration file for SaaS Boilerplate setup scripts
# You can modify these values to match your local setup

# API Configuration
export API_BASE_URL="http://localhost:3001/api"
export API_HOST="localhost"
export API_PORT="3001"

# Database Configuration (for Adminer)
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="saas_boilerplate"
export DB_USER="saas_user"
export DB_PASSWORD="saas_password"

# Default tenant configuration
export DEFAULT_TENANT_NAME="Default Tenant"
export DEFAULT_TENANT_DOMAIN="example.com"

# Test user credentials
export SUPERADMIN_EMAIL="superadmin@example.com"
export SUPERADMIN_PASSWORD="SuperAdmin123!"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="Admin123!"
export MANAGER_EMAIL="manager@example.com"
export MANAGER_PASSWORD="Manager123!"
export USER_EMAIL="user@example.com"
export USER_PASSWORD="User123!"
export VIEWER_EMAIL="viewer@example.com"
export VIEWER_PASSWORD="Viewer123!"

# Adminer Configuration
export ADMINER_PORT="8080"
export ADMINER_DESIGN="pepa-linha-dark"

# Script Configuration
export SCRIPT_TIMEOUT="30"  # seconds to wait for API responses
export MAX_RETRIES="3"      # number of retries for API calls

# Colors for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export NC='\033[0m' # No Color

# Function to load configuration
load_config() {
    if [ -f "$(dirname "$0")/config.sh" ]; then
        source "$(dirname "$0")/config.sh"
    fi
}

# Function to print configuration
print_config() {
    echo "🔧 Current Configuration:"
    echo "   API URL: $API_BASE_URL"
    echo "   Database: $DB_HOST:$DB_PORT/$DB_NAME"
    echo "   Adminer Port: $ADMINER_PORT"
    echo ""
}

# Load configuration when this file is sourced
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    load_config
fi 