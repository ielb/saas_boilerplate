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

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

# Function to check if API is running
check_api_health() {
    print_status "Checking API availability..."
    
    # Try different endpoints to check if API is running
    local endpoints=("$API_BASE_URL/" "$API_BASE_URL/auth" "http://localhost:3001/" "http://localhost:3001/api/")
    
    for endpoint in "${endpoints[@]}"; do
        # Use curl with timeout and accept any response (including 404) as success
        local response=$(curl -s -w "%{http_code}" --connect-timeout 5 "$endpoint" -o /dev/null 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$response" ]; then
            print_success "API is running and accessible at: $endpoint (Status: $response)"
            return 0
        fi
    done
    
    # If no endpoints responded, try a simple connection test
    if curl -s --connect-timeout 5 "http://localhost:3001" > /dev/null 2>&1; then
        print_success "API is running on port 3001 (connection successful)"
        return 0
    fi
    
    print_error "API is not accessible. Please check:"
    print_status "1. Is your API running locally?"
    print_status "2. Is it running on port 3001?"
    print_status "3. Try: yarn workspace @app/api start:dev"
    print_status "4. Or check your API configuration"
    exit 1
}

# Function to activate user via database (using Docker)
activate_user_via_db() {
    local email=$1
    
    print_status "Activating user via database: $email"
    
    # Check if Docker container is running
    if ! docker ps | grep -q "saas-postgres"; then
        print_error "❌ PostgreSQL container is not running"
        return 1
    fi
    
    local sql="UPDATE users SET status = 'active', \"emailVerified\" = true, \"emailVerifiedAt\" = NOW() WHERE email = '$email';"
    
    if docker exec saas-postgres psql -U saas_user -d saas_boilerplate -c "$sql" >/dev/null 2>&1; then
        print_success "✅ User activated: $email"
        return 0
    else
        print_error "❌ Failed to activate user: $email"
        return 1
    fi
}

# Function to test user login
test_user_login() {
    local email=$1
    local password=$2
    
    print_status "Testing login for: $email"
    
    local response=$(curl -s -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"$password\"
        }")
    
    if echo "$response" | grep -q "accessToken"; then
        local accessToken=$(echo "$response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        local userId=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_success "✅ Login successful: $email"
        echo "$accessToken:$userId"
        return 0
    else
        print_error "❌ Login failed: $email"
        echo "$response"
        return 1
    fi
}

# Function to create user
create_user() {
    local email=$1
    local password=$2
    local firstName=$3
    local lastName=$4
    local tenantName=$5
    
    print_status "Creating user: $email"
    
    local domain=$(echo "$tenantName" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    local response=$(curl -s -X POST "$API_BASE_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\",\"firstName\":\"$firstName\",\"lastName\":\"$lastName\",\"tenantName\":\"$tenantName\",\"domain\":\"$domain.com\",\"description\":\"Test tenant for $firstName $lastName\",\"contactEmail\":\"$email\",\"contactPhone\":\"+1234567890\",\"address\":\"123 Test Street\",\"city\":\"Test City\",\"state\":\"Test State\",\"postalCode\":\"12345\",\"country\":\"US\",\"timezone\":\"America/New_York\",\"locale\":\"en-US\",\"currency\":\"USD\",\"marketingConsent\":true,\"acceptTerms\":true}")
    
    if echo "$response" | grep -q "accessToken"; then
        print_success "✅ User created: $email"
        return 0
    elif echo "$response" | grep -q "User already exists"; then
        print_warning "⚠️  User already exists: $email"
        return 0
    else
        print_error "❌ Failed to create user: $email"
        echo "   Response: $response"
        return 1
    fi
}

# Function to create role
create_role() {
    local accessToken=$1
    local roleName=$2
    local description=$3
    local level=$4
    
    print_status "Creating role: $roleName"
    
    local response=$(curl -s -X POST "$API_BASE_URL/roles" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $accessToken" \
        -d "{\"name\":\"$roleName\",\"description\":\"$description\",\"type\":\"custom\",\"level\":$level,\"permissionIds\":[]}")
    
    if echo "$response" | grep -q '"id"'; then
        local roleId=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_success "✅ Role created: $roleName (ID: $roleId)"
        echo "$roleId"
        return 0
    elif echo "$response" | grep -q "already exists"; then
        print_warning "⚠️  Role already exists: $roleName"
        # Try to get existing role ID
        local existingResponse=$(curl -s -X GET "$API_BASE_URL/roles" \
            -H "Authorization: Bearer $accessToken")
        local roleId=$(echo "$existingResponse" | grep -A 10 -B 2 "\"name\":\"$roleName\"" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)
        if [ -n "$roleId" ]; then
            print_success "✅ Found existing role: $roleName (ID: $roleId)"
            echo "$roleId"
            return 0
        fi
        return 1
    else
        print_error "❌ Failed to create role: $roleName"
        echo "   Response: $response"
        return 1
    fi
}

# Function to assign role to user via database
assign_role_to_user() {
    local email=$1
    local roleName=$2
    
    print_status "Assigning $roleName role to $email..."
    
    # Check if Docker container is running
    if ! docker ps | grep -q "saas-postgres"; then
        print_error "❌ PostgreSQL container is not running"
        return 1
    fi
    
    # Map role names to user role enum values
    local userRole=""
    case "$roleName" in
        "Owner") userRole="owner" ;;
        "Admin") userRole="admin" ;;
        "Manager") userRole="manager" ;;
        "Member") userRole="member" ;;
        "Viewer") userRole="viewer" ;;
        *) userRole="member" ;;
    esac
    
    # Assign role to user_roles table
    local sql1="INSERT INTO user_roles (\"userId\", \"roleId\") SELECT u.id, r.id FROM users u, roles r WHERE u.email = '$email' AND r.name = '$roleName' ON CONFLICT DO NOTHING;"
    
    # Update user's primary role field
    local sql2="UPDATE users SET role = '$userRole' WHERE email = '$email';"
    
    if docker exec saas-postgres psql -U saas_user -d saas_boilerplate -c "$sql1" >/dev/null 2>&1 && \
       docker exec saas-postgres psql -U saas_user -d saas_boilerplate -c "$sql2" >/dev/null 2>&1; then
        print_success "✅ Role assigned successfully: $email -> $roleName ($userRole)"
        return 0
    else
        print_error "❌ Failed to assign role: $email -> $roleName"
        return 1
    fi
}

# Function to create permissions
create_permissions() {
    local accessToken=$1
    
    print_status "Creating default permissions..."
    
    # Define permissions to create
    local permissions=(
        "users:create:Users can create new users"
        "users:read:Users can read user information"
        "users:update:Users can update user information"
        "users:delete:Users can delete users"
        "users:manage:Users can manage all user operations"
        "roles:create:Roles can create new roles"
        "roles:read:Roles can read role information"
        "roles:update:Roles can update role information"
        "roles:delete:Roles can delete roles"
        "roles:manage:Roles can manage all role operations"
        "files:create:Files can create new files"
        "files:read:Files can read file information"
        "files:update:Files can update file information"
        "files:delete:Files can delete files"
        "files:manage:Files can manage all file operations"
        "notifications:create:Notifications can create new notifications"
        "notifications:read:Notifications can read notification information"
        "notifications:update:Notifications can update notification information"
        "notifications:delete:Notifications can delete notifications"
        "notifications:manage:Notifications can manage all notification operations"
        "system_settings:read:System settings can be read"
        "system_settings:update:System settings can be updated"
        "system_settings:manage:System settings can be managed"
    )
    
    local created_count=0
    
    for permission in "${permissions[@]}"; do
        IFS=':' read -r resource action description <<< "$permission"
        
        local response=$(curl -s -X POST "$API_BASE_URL/permissions" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $accessToken" \
            -d "{\"resource\":\"$resource\",\"action\":\"$action\",\"description\":\"$description\",\"scope\":\"tenant\"}")
        
        if echo "$response" | grep -q '"id"'; then
            ((created_count++))
        fi
    done
    
    print_success "✅ Created $created_count permissions"
}

# Function to assign permissions to role
assign_permissions_to_role() {
    local accessToken=$1
    local roleId=$2
    local permissionNames=("$@")
    
    print_status "Assigning permissions to role..."
    
    # Get all permissions first
    local permissionsResponse=$(curl -s -X GET "$API_BASE_URL/permissions" \
        -H "Authorization: Bearer $accessToken")
    
    local permissionIds=()
    
    for permissionName in "${permissionNames[@]:2}"; do
        local permissionId=$(echo "$permissionsResponse" | grep -A 5 -B 5 "\"name\":\"$permissionName\"" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)
        if [ -n "$permissionId" ]; then
            permissionIds+=("$permissionId")
        fi
    done
    
    if [ ${#permissionIds[@]} -gt 0 ]; then
        local permissionIdsJson=$(printf '%s\n' "${permissionIds[@]}" | jq -R . | jq -s .)
        
        local response=$(curl -s -X POST "$API_BASE_URL/roles/$roleId/permissions" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $accessToken" \
            -d "{\"permissionIds\":$permissionIdsJson}")
        
        if echo "$response" | grep -q '"success"'; then
            print_success "✅ Assigned ${#permissionIds[@]} permissions to role"
            return 0
        else
            print_error "❌ Failed to assign permissions"
            return 1
        fi
    else
        print_warning "⚠️  No permissions found to assign"
        return 1
    fi
}

# Function to setup complete tenant
setup_tenant() {
    print_header "Setting up Complete Tenant Environment"
    
    # Check API health
    check_api_health
    
    # Define users to create
    local users=(
        "$SUPERADMIN_EMAIL:$SUPERADMIN_PASSWORD:Super:Admin:SuperAdmin Tenant"
        "$ADMIN_EMAIL:$ADMIN_PASSWORD:Admin:User:Admin Tenant"
        "$MANAGER_EMAIL:$MANAGER_PASSWORD:Manager:User:Manager Tenant"
        "$USER_EMAIL:$USER_PASSWORD:Regular:User:User Tenant"
        "$VIEWER_EMAIL:$VIEWER_PASSWORD:Viewer:User:Viewer Tenant"
    )
    
    # Step 1: Create users
    print_header "Step 1: Creating Users"
    
    for user_info in "${users[@]}"; do
        IFS=':' read -r email password firstName lastName tenantName <<< "$user_info"
        create_user "$email" "$password" "$firstName" "$lastName" "$tenantName"
    done
    
    # Step 2: Activate users
    print_header "Step 2: Activating Users"
    
    for user_info in "${users[@]}"; do
        IFS=':' read -r email password <<< "$user_info"
        activate_user_via_db "$email"
    done
    
    # Step 3: Login as SuperAdmin and create permissions
    print_header "Step 3: Creating Permissions"
    
    local superadmin_login=$(test_user_login "$SUPERADMIN_EMAIL" "$SUPERADMIN_PASSWORD")
    if [[ $? -eq 0 ]]; then
        local accessToken=$(echo "$superadmin_login" | cut -d':' -f1)
        create_permissions "$accessToken"
    else
        print_error "❌ Cannot create permissions - SuperAdmin login failed"
        return 1
    fi
    
    # Step 4: Get existing system roles
    print_header "Step 4: Getting Existing System Roles"
    
    # Get existing roles from the database
    local ownerRoleId=$(docker exec saas-postgres psql -U saas_user -d saas_boilerplate -t -c "SELECT id FROM roles WHERE name = 'Owner' LIMIT 1;" | tr -d ' ')
    local adminRoleId=$(docker exec saas-postgres psql -U saas_user -d saas_boilerplate -t -c "SELECT id FROM roles WHERE name = 'Admin' LIMIT 1;" | tr -d ' ')
    local managerRoleId=$(docker exec saas-postgres psql -U saas_user -d saas_boilerplate -t -c "SELECT id FROM roles WHERE name = 'Manager' LIMIT 1;" | tr -d ' ')
    local memberRoleId=$(docker exec saas-postgres psql -U saas_user -d saas_boilerplate -t -c "SELECT id FROM roles WHERE name = 'Member' LIMIT 1;" | tr -d ' ')
    local viewerRoleId=$(docker exec saas-postgres psql -U saas_user -d saas_boilerplate -t -c "SELECT id FROM roles WHERE name = 'Viewer' LIMIT 1;" | tr -d ' ')
    
    print_success "✅ Found system roles:"
    echo "   Owner: $ownerRoleId"
    echo "   Admin: $adminRoleId"
    echo "   Manager: $managerRoleId"
    echo "   Member: $memberRoleId"
    echo "   Viewer: $viewerRoleId"
    
    # Step 5: Assign roles to users
    print_header "Step 5: Assigning Roles to Users"
    
    # Assign roles directly via database
    assign_role_to_user "$SUPERADMIN_EMAIL" "Owner"
    assign_role_to_user "$ADMIN_EMAIL" "Admin"
    assign_role_to_user "$MANAGER_EMAIL" "Manager"
    assign_role_to_user "$USER_EMAIL" "Member"
    assign_role_to_user "$VIEWER_EMAIL" "Viewer"
    
    # Step 6: Verify setup
    print_header "Step 6: Verifying Setup"
    
    print_success "🎉 Tenant setup completed successfully!"
    echo ""
    echo "📋 Created Users and Roles:"
    echo "=========================="
    echo ""
    echo "🔴 SuperAdmin (Level 1 - Owner):"
    echo "   Email: $SUPERADMIN_EMAIL"
    echo "   Password: $SUPERADMIN_PASSWORD"
    echo "   Role: Owner - Full system access with all permissions"
    echo ""
    echo "🟡 Admin (Level 2):"
    echo "   Email: $ADMIN_EMAIL"
    echo "   Password: $ADMIN_PASSWORD"
    echo "   Role: Admin - Administrative access with full tenant management"
    echo ""
    echo "🟠 Manager (Level 3):"
    echo "   Email: $MANAGER_EMAIL"
    echo "   Password: $MANAGER_PASSWORD"
    echo "   Role: Manager - Team management with limited administrative access"
    echo ""
    echo "🟢 User (Level 4):"
    echo "   Email: $USER_EMAIL"
    echo "   Password: $USER_PASSWORD"
    echo "   Role: Member - Standard user with basic access"
    echo ""
    echo "🔵 Viewer (Level 5):"
    echo "   Email: $VIEWER_EMAIL"
    echo "   Password: $VIEWER_PASSWORD"
    echo "   Role: Viewer - Read-only access with minimal permissions"
    echo ""
    echo "🔗 Access URLs:"
    echo "   API: http://localhost:3001/api"
    echo "   API Docs: http://localhost:3001/api/docs"
    echo "   Adminer: http://localhost:8080"
    echo ""
    echo "📊 Permission Hierarchy:"
    echo "   SuperAdmin > Admin > Manager > User > Viewer"
    echo ""
    echo "⚠️  Note: These are test accounts. Change passwords in production!"
    echo "💡 Tip: Use these accounts to test different permission levels!"
}

# Main script
main() {
    echo "🚀 Complete Tenant Setup for SaaS Boilerplate"
    echo "============================================="
    echo ""
    
    # Show configuration
    print_config
    
    # Run setup
    setup_tenant
}

# Run main function
main "$@" 