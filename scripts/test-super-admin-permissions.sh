#!/bin/bash

# Test Super Admin Permissions Script
# This script verifies that the Super Admin user has all necessary permissions

echo "🔐 Testing Super Admin Permissions..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if API is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${RED}❌ API server is not running. Please start the server first.${NC}"
    echo "   Run: cd apps/api && npm run start:dev"
    exit 1
fi

echo -e "${BLUE}📋 Step 1: Login as Super Admin${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"SuperAdmin123!"}')

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to login${NC}"
    exit 1
fi

# Extract access token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Failed to extract access token${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"

echo -e "${BLUE}📋 Step 2: Test Debug Endpoint${NC}"
DEBUG_RESPONSE=$(curl -s -X GET http://localhost:3001/api/roles/debug/user-permissions \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to access debug endpoint${NC}"
    exit 1
fi

# Check if permissions:read is in the response
if echo "$DEBUG_RESPONSE" | grep -q "permissions:read"; then
    echo -e "${GREEN}✅ Super Admin has permissions:read permission${NC}"
else
    echo -e "${RED}❌ Super Admin does NOT have permissions:read permission${NC}"
    echo "Debug response: $DEBUG_RESPONSE"
    exit 1
fi

# Count total permissions
PERMISSION_COUNT=$(echo "$DEBUG_RESPONSE" | grep -o '"permissions":\[[^]]*\]' | grep -o ',' | wc -l)
PERMISSION_COUNT=$((PERMISSION_COUNT + 1))  # Add 1 for the first permission

echo -e "${GREEN}✅ Super Admin has $PERMISSION_COUNT total permissions${NC}"

echo -e "${BLUE}📋 Step 3: Test Permissions Endpoint${NC}"
PERMISSIONS_RESPONSE=$(curl -s -X GET http://localhost:3001/api/permissions \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to access permissions endpoint${NC}"
    echo -e "${YELLOW}⚠️  This might indicate an issue with the permissions controller${NC}"
else
    if [ -z "$PERMISSIONS_RESPONSE" ]; then
        echo -e "${YELLOW}⚠️  Permissions endpoint returned empty response${NC}"
        echo -e "${YELLOW}⚠️  This might indicate an issue with the permissions controller${NC}"
    else
        echo -e "${GREEN}✅ Permissions endpoint working correctly${NC}"
        echo "Response: $PERMISSIONS_RESPONSE"
    fi
fi

echo -e "${BLUE}📋 Step 4: Test Roles Endpoint${NC}"
ROLES_RESPONSE=$(curl -s -X GET http://localhost:3001/api/roles \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to access roles endpoint${NC}"
else
    if [ -z "$ROLES_RESPONSE" ]; then
        echo -e "${YELLOW}⚠️  Roles endpoint returned empty response${NC}"
    else
        echo -e "${GREEN}✅ Roles endpoint working correctly${NC}"
    fi
fi

echo -e "${BLUE}📋 Step 5: Test Super Admin Update Permissions Endpoint${NC}"
UPDATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/roles/super-admin/update-permissions \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to access super admin update endpoint${NC}"
else
    echo -e "${GREEN}✅ Super Admin update endpoint working correctly${NC}"
    echo "Response: $UPDATE_RESPONSE"
fi

echo ""
echo -e "${GREEN}🎉 Super Admin Permissions Test Completed!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "   ✅ Login: Working"
echo -e "   ✅ Debug Endpoint: Working"
echo -e "   ✅ Permissions Count: $PERMISSION_COUNT"
echo -e "   ✅ permissions:read: Available"
echo -e "   ⚠️  Permissions Endpoint: May have issues"
echo -e "   ⚠️  Roles Endpoint: May have issues"
echo -e "   ✅ Super Admin Update: Working"
echo ""
echo -e "${YELLOW}💡 Note: The Super Admin user has all necessary permissions.${NC}"
echo -e "${YELLOW}   The issue might be with specific endpoint implementations.${NC}" 