#!/bin/bash

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to test API endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    
    print_status "Testing: $description"
    local response=$(curl -s -w "%{http_code}" --connect-timeout 5 "$endpoint" -o /tmp/api_test_response 2>/dev/null)
    local status_code=${response: -3}
    local response_body=$(cat /tmp/api_test_response 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$status_code" ]; then
        if [ "$status_code" = "200" ] || [ "$status_code" = "404" ] || [ "$status_code" = "401" ]; then
            print_success "✅ $description - Status: $status_code"
            if [ "$status_code" = "404" ]; then
                print_warning "   Endpoint not found (this might be normal)"
            elif [ "$status_code" = "401" ]; then
                print_warning "   Authentication required (this is expected for protected endpoints)"
            fi
        else
            print_error "❌ $description - Status: $status_code"
            if [ -n "$response_body" ]; then
                echo "   Response: $response_body"
            fi
        fi
    else
        print_error "❌ $description - Connection failed"
    fi
    echo ""
}

# Function to test database connection
test_database() {
    print_status "Testing database connection..."
    
    if command -v psql >/dev/null 2>&1; then
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
            print_success "✅ Database connection successful"
        else
            print_error "❌ Database connection failed"
            print_status "   Check your database configuration in scripts/config.sh"
        fi
    else
        print_warning "⚠️  psql not found - skipping database test"
        print_status "   Install PostgreSQL client to test database connection"
    fi
    echo ""
}

# Main script
main() {
    echo "🧪 Testing SaaS Boilerplate API Setup"
    echo "====================================="
    echo ""
    
    # Show configuration
    print_config
    
    # Test API endpoints
    echo "📡 Testing API Endpoints:"
    echo "------------------------"
    
    test_endpoint "$API_BASE_URL/" "API Base URL"
    test_endpoint "$API_BASE_URL/auth" "Auth Endpoint"
    test_endpoint "$API_BASE_URL/permissions" "Permissions Endpoint"
    test_endpoint "$API_BASE_URL/roles" "Roles Endpoint"
    test_endpoint "http://localhost:$API_PORT/" "API Root"
    test_endpoint "http://localhost:$API_PORT/api/" "API Base (alternative)"
    
    # Test database
    echo "🗄️  Testing Database:"
    echo "-------------------"
    test_database
    
    # Summary
    echo "📋 Summary:"
    echo "----------"
    print_status "If you see mostly ✅ marks, your API is ready for setup scripts!"
    print_status "If you see ❌ marks, check your API configuration and make sure it's running."
    echo ""
                    print_status "To start setup:"
                echo "   ./scripts/setup-tenant.sh"
    echo ""
    print_status "To start Adminer:"
    echo "   ./scripts/start-adminer.sh"
}

# Cleanup
cleanup() {
    rm -f /tmp/api_test_response
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Run main function
main "$@" 