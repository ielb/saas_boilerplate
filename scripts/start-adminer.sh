#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check if API is running
check_api_health() {
    print_status "Checking API availability..."
    
    # Try different endpoints to check if API is running
    local endpoints=("$API_BASE_URL/" "$API_BASE_URL/auth" "http://localhost:3001/" "http://localhost:3001/api/")
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s -f "$endpoint" > /dev/null 2>&1; then
            print_success "API is running and accessible at: $endpoint"
            return 0
        fi
    done
    
    print_warning "API might not be running, but continuing with Adminer setup..."
    print_status "Make sure your local API is running on port 3001"
    return 0
}

# Function to start Adminer with Docker
start_adminer() {
    print_status "Starting Adminer for database management..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Adminer is already running
    if docker ps | grep -q "adminer"; then
        print_warning "Adminer is already running!"
        print_status "Access Adminer at: http://localhost:$ADMINER_PORT"
        return 0
    fi
    
    # Start Adminer container
    print_status "Starting Adminer container..."
    docker run -d \
        --name saas-adminer \
        -p $ADMINER_PORT:8080 \
        -e ADMINER_DEFAULT_SERVER=$DB_HOST \
        -e ADMINER_DESIGN=$ADMINER_DESIGN \
        adminer:latest
    
    if [ $? -eq 0 ]; then
        print_success "Adminer started successfully!"
        echo ""
        echo "🔗 Access Adminer at: http://localhost:$ADMINER_PORT"
        echo "🔗 Database connection details:"
        echo "   - Server: $DB_HOST"
        echo "   - Port: $DB_PORT"
        echo "   - Username: $DB_USER"
        echo "   - Password: $DB_PASSWORD"
        echo "   - Database: $DB_NAME"
        echo ""
        echo "🛑 To stop Adminer: docker stop saas-adminer && docker rm saas-adminer"
    else
        print_error "Failed to start Adminer"
        exit 1
    fi
}

# Main script
main() {
    echo "🚀 Starting Adminer for SaaS Boilerplate Database Management"
    echo "============================================================"
    
    # Show configuration
    print_config
    
    # Check API health
    check_api_health
    
    # Start Adminer
    start_adminer
}

# Run main function
main "$@" 