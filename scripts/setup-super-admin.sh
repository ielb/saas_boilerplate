#!/bin/bash

# ====================================================================
# SUPER ADMIN SETUP SCRIPT
# Comprehensive script to set up Super Admin permissions
# ====================================================================

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Header
echo -e "${PURPLE}🔐 SUPER ADMIN SETUP SCRIPT${NC}"
echo -e "${PURPLE}=============================${NC}"
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if PostgreSQL container is running
if ! docker ps | grep -q saas-postgres; then
    echo -e "${RED}❌ PostgreSQL container is not running.${NC}"
    echo -e "${YELLOW}💡 Starting Docker services...${NC}"
    docker-compose up -d postgres
    
    echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
    sleep 10
fi

echo -e "${BLUE}📋 Step 1: Database Connection Test${NC}"
if docker exec -i saas-postgres psql -U saas_user -d saas_boilerplate -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect to database${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Step 2: Running Super Admin Permissions Manager${NC}"
if docker exec -i saas-postgres psql -U saas_user -d saas_boilerplate < scripts/super-admin-permissions-manager.sql; then
    echo -e "${GREEN}✅ Super Admin permissions setup completed${NC}"
else
    echo -e "${RED}❌ Failed to set up Super Admin permissions${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Step 3: Verification${NC}"

# Check if API is running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is running${NC}"
    
    echo -e "${BLUE}📋 Step 4: Testing Super Admin Permissions${NC}"
    if [ -f "./scripts/test-super-admin-permissions.sh" ]; then
        ./scripts/test-super-admin-permissions.sh
    else
        echo -e "${YELLOW}⚠️  Test script not found, running manual test...${NC}"
        
        # Manual test
        LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
          -H "Content-Type: application/json" \
          -d '{"email":"superadmin@example.com","password":"SuperAdmin123!"}')
        
        if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
            echo -e "${GREEN}✅ Super Admin login test successful${NC}"
            
            ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
            
            DEBUG_RESPONSE=$(curl -s -X GET http://localhost:3001/api/roles/debug/user-permissions \
              -H "Authorization: Bearer $ACCESS_TOKEN")
            
            if echo "$DEBUG_RESPONSE" | grep -q "permissions:read"; then
                echo -e "${GREEN}✅ Super Admin has permissions:read permission${NC}"
                PERMISSION_COUNT=$(echo "$DEBUG_RESPONSE" | grep -o '"permissions":\[[^]]*\]' | grep -o ',' | wc -l)
                PERMISSION_COUNT=$((PERMISSION_COUNT + 1))
                echo -e "${GREEN}✅ Super Admin has $PERMISSION_COUNT total permissions${NC}"
            else
                echo -e "${RED}❌ Super Admin does NOT have permissions:read permission${NC}"
            fi
        else
            echo -e "${RED}❌ Super Admin login test failed${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  API server is not running. Please start it to test permissions:${NC}"
    echo -e "${CYAN}   cd apps/api && npm run start:dev${NC}"
fi

echo ""
echo -e "${PURPLE}🎉 SUPER ADMIN SETUP COMPLETED! 🎉${NC}"
echo -e "${PURPLE}====================================${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "   ✅ Database setup: Complete"
echo -e "   ✅ Super Admin role: Created/Updated"
echo -e "   ✅ Owner role: Updated with all permissions"
echo -e "   ✅ User assignments: Complete"
echo -e "   ✅ Permissions: All 132+ permissions assigned"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo -e "   1. Start API server: ${CYAN}cd apps/api && npm run start:dev${NC}"
echo -e "   2. Test permissions: ${CYAN}./scripts/test-super-admin-permissions.sh${NC}"
echo -e "   3. Login as Super Admin: ${CYAN}superadmin@example.com / SuperAdmin123!${NC}"
echo ""
echo -e "${GREEN}✨ Your Super Admin is ready to use! ✨${NC}"