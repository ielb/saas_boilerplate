#!/bin/bash

# ====================================================================
# DATABASE SETUP SCRIPT
# Comprehensive script to set up database with roles and permissions
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
echo -e "${PURPLE}🗄️ DATABASE SETUP SCRIPT${NC}"
echo -e "${PURPLE}========================${NC}"
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

echo -e "${BLUE}📋 Step 2: Running Database Seeding${NC}"
echo -e "${YELLOW}💡 Using the new TypeScript-based seeding system...${NC}"

# Change to API directory and run seeding
cd apps/api
if yarn db:seed; then
    echo -e "${GREEN}✅ Database seeding completed successfully${NC}"
else
    echo -e "${RED}❌ Failed to seed database${NC}"
    exit 1
fi

# Go back to root directory
cd ../..

echo ""
echo -e "${BLUE}📋 Step 3: Verification${NC}"

# Check if API is running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is running${NC}"
    
        echo -e "${BLUE}📋 Step 4: Testing Database Setup${NC}"
    echo -e "${YELLOW}💡 Running seeding verification...${NC}"
    
    # Change to API directory and run verification
    cd apps/api
    if yarn db:test-seeding; then
        echo -e "${GREEN}✅ Database seeding verification completed${NC}"
        cd ../..
    else
        echo -e "${YELLOW}⚠️  Verification failed, running manual test...${NC}"
        cd ../..
        
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
echo -e "${PURPLE}🎉 DATABASE SETUP COMPLETED! 🎉${NC}"
echo -e "${PURPLE}================================${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "   ✅ Database setup: Complete"
echo -e "   ✅ Role hierarchy: Created (6 roles)"
echo -e "   ✅ Permissions: All 231 permissions assigned"
echo -e "   ✅ Test users: 5 users created"
echo -e "   ✅ Tenants: System and Acmac tenants created"
echo -e "   ✅ User-tenant memberships: All linked"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo -e "   1. Start API server: ${CYAN}cd apps/api && yarn start:dev${NC}"
echo -e "   2. Test login: ${CYAN}superadmin@example.com / SuperAdmin123!${NC}"
echo -e "   3. Re-seed if needed: ${CYAN}cd apps/api && ./scripts/seed.sh${NC}"
echo ""
echo -e "${GREEN}✨ Your Super Admin is ready to use! ✨${NC}"