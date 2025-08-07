-- ====================================================================
-- SUPER ADMIN PERMISSIONS MANAGER
-- Comprehensive script to manage Super Admin permissions
-- ====================================================================
-- This script handles:
-- 1. Creates Super Admin role if it doesn't exist
-- 2. Updates existing Owner role with all permissions
-- 3. Assigns Super Admin user to Owner role
-- 4. Verifies all permissions are correctly assigned
-- 5. Provides comprehensive reporting
-- ====================================================================

-- Connect to the database
\c saas_boilerplate;

-- Display header
SELECT '🔐 SUPER ADMIN PERMISSIONS MANAGER' as header;
SELECT '=====================================' as separator;

-- ====================================================================
-- STEP 1: SYSTEM OVERVIEW
-- ====================================================================
SELECT '📊 STEP 1: SYSTEM OVERVIEW' as step;

SELECT 'Current System State:' as info;
SELECT 
    'Total Active Permissions' as metric,
    COUNT(*) as count
FROM permissions 
WHERE "isActive" = true
UNION ALL
SELECT 
    'Total Roles' as metric,
    COUNT(*) as count
FROM roles 
WHERE "isActive" = true
UNION ALL
SELECT 
    'Super Admin Users' as metric,
    COUNT(*) as count
FROM users 
WHERE email = 'superadmin@example.com';

SELECT 'Current Roles:' as info;
SELECT 
    name,
    level,
    type,
    "isSystem",
    "isActive",
    description
FROM roles 
ORDER BY level;

-- ====================================================================
-- STEP 2: ROLE MANAGEMENT
-- ====================================================================
SELECT '🏗️ STEP 2: ROLE MANAGEMENT' as step;

-- Create Super Admin role if it doesn't exist
DO $$
DECLARE
    super_admin_role_id UUID;
    owner_role_id UUID;
    permission_count INTEGER;
    user_id UUID;
BEGIN
    -- Check if Super Admin role exists
    SELECT id INTO super_admin_role_id 
    FROM roles 
    WHERE name = 'Super Admin';
    
    IF super_admin_role_id IS NULL THEN
        -- Create Super Admin role
        INSERT INTO roles (
            name,
            description,
            level,
            type,
            "isSystem",
            "isActive",
            "createdAt",
            "updatedAt"
        ) VALUES (
            'Super Admin',
            'Ultimate system administrator with ALL permissions',
            0, -- Highest level
            'system',
            true,
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO super_admin_role_id;
        
        RAISE NOTICE '✅ Created Super Admin role with ID: %', super_admin_role_id;
    ELSE
        RAISE NOTICE '✅ Super Admin role already exists with ID: %', super_admin_role_id;
    END IF;
    
    -- Get Owner role ID
    SELECT id INTO owner_role_id 
    FROM roles 
    WHERE name = 'Owner';
    
    IF owner_role_id IS NULL THEN
        RAISE EXCEPTION '❌ Owner role not found. Please create default roles first.';
    END IF;
    
    RAISE NOTICE '✅ Found Owner role with ID: %', owner_role_id;
    
END $$;

-- ====================================================================
-- STEP 3: PERMISSION ASSIGNMENT
-- ====================================================================
SELECT '🔑 STEP 3: PERMISSION ASSIGNMENT' as step;

DO $$
DECLARE
    super_admin_role_id UUID;
    owner_role_id UUID;
    permission_count INTEGER;
BEGIN
    -- Get role IDs
    SELECT id INTO super_admin_role_id FROM roles WHERE name = 'Super Admin';
    SELECT id INTO owner_role_id FROM roles WHERE name = 'Owner';
    
    -- Remove existing permissions from both roles
    DELETE FROM "role_permissions" WHERE "roleId" IN (super_admin_role_id, owner_role_id);
    GET DIAGNOSTICS permission_count = ROW_COUNT;
    RAISE NOTICE '🧹 Removed % existing permissions from Super Admin and Owner roles', permission_count;
    
    -- Assign ALL active permissions to Super Admin role
    INSERT INTO "role_permissions" ("roleId", "permissionId")
    SELECT super_admin_role_id, id
    FROM permissions 
    WHERE "isActive" = true;
    
    GET DIAGNOSTICS permission_count = ROW_COUNT;
    RAISE NOTICE '✅ Assigned % permissions to Super Admin role', permission_count;
    
    -- Assign ALL active permissions to Owner role (for existing users)
    INSERT INTO "role_permissions" ("roleId", "permissionId")
    SELECT owner_role_id, id
    FROM permissions 
    WHERE "isActive" = true;
    
    GET DIAGNOSTICS permission_count = ROW_COUNT;
    RAISE NOTICE '✅ Assigned % permissions to Owner role', permission_count;
    
    -- Update Owner role description
    UPDATE roles 
    SET description = 'Full system access with ALL permissions (Super Admin equivalent)',
        "updatedAt" = NOW()
    WHERE id = owner_role_id;
    
    RAISE NOTICE '✅ Updated Owner role description';
    
END $$;

-- ====================================================================
-- STEP 4: USER ROLE ASSIGNMENT
-- ====================================================================
SELECT '👤 STEP 4: USER ROLE ASSIGNMENT' as step;

DO $$
DECLARE
    super_admin_user_id UUID;
    owner_role_id UUID;
    super_admin_role_id UUID;
    existing_assignments INTEGER;
BEGIN
    -- Get Super Admin user ID
    SELECT id INTO super_admin_user_id 
    FROM users 
    WHERE email = 'superadmin@example.com';
    
    IF super_admin_user_id IS NULL THEN
        RAISE EXCEPTION '❌ Super Admin user not found. Please create the user first.';
    END IF;
    
    -- Get role IDs
    SELECT id INTO owner_role_id FROM roles WHERE name = 'Owner';
    SELECT id INTO super_admin_role_id FROM roles WHERE name = 'Super Admin';
    
    -- Check existing role assignments
    SELECT COUNT(*) INTO existing_assignments
    FROM "user_roles" 
    WHERE "userId" = super_admin_user_id;
    
    RAISE NOTICE 'Super Admin user has % existing role assignments', existing_assignments;
    
    -- Ensure Super Admin user has Owner role
    INSERT INTO "user_roles" ("userId", "roleId", "createdAt")
    SELECT super_admin_user_id, owner_role_id, NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM "user_roles" 
        WHERE "userId" = super_admin_user_id AND "roleId" = owner_role_id
    );
    
    -- Ensure Super Admin user has Super Admin role
    INSERT INTO "user_roles" ("userId", "roleId", "createdAt")
    SELECT super_admin_user_id, super_admin_role_id, NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM "user_roles" 
        WHERE "userId" = super_admin_user_id AND "roleId" = super_admin_role_id
    );
    
    RAISE NOTICE '✅ Super Admin user role assignments updated';
    
END $$;

-- ====================================================================
-- STEP 5: VERIFICATION & REPORTING
-- ====================================================================
SELECT '🔍 STEP 5: VERIFICATION & REPORTING' as step;

-- Super Admin User Information
SELECT 'Super Admin User Details:' as info;
SELECT 
    u.id,
    u.email,
    u."firstName",
    u."lastName",
    u.role as "userRole",
    u.status,
    u."tenantId",
    u."createdAt"
FROM users u
WHERE u.email = 'superadmin@example.com';

-- User Role Assignments
SELECT 'Super Admin User Role Assignments:' as info;
SELECT 
    u.email,
    r.name as role_name,
    r.level as role_level,
    r.type as role_type,
    r.description,
    ur."createdAt" as assigned_at
FROM users u
JOIN "user_roles" ur ON u.id = ur."userId"
JOIN roles r ON ur."roleId" = r.id
WHERE u.email = 'superadmin@example.com'
ORDER BY r.level;

-- Permission Counts by Role
SELECT 'Permission Counts by Role:' as info;
SELECT 
    r.name as role_name,
    r.level,
    COUNT(rp."permissionId") as permission_count
FROM roles r
LEFT JOIN "role_permissions" rp ON r.id = rp."roleId"
WHERE r.name IN ('Super Admin', 'Owner', 'Admin', 'Manager', 'Member')
GROUP BY r.id, r.name, r.level
ORDER BY r.level;

-- Super Admin Permissions Sample
SELECT 'Super Admin Permissions Sample (first 20):' as info;
SELECT 
    p.name as permission_name,
    p.resource,
    p.action,
    p.scope,
    p."isSystem"
FROM "role_permissions" rp 
JOIN roles r ON rp."roleId" = r.id 
JOIN permissions p ON rp."permissionId" = p.id 
WHERE r.name = 'Super Admin'
ORDER BY p.resource, p.action
LIMIT 20;

-- Owner Permissions Sample
SELECT 'Owner Permissions Sample (first 20):' as info;
SELECT 
    p.name as permission_name,
    p.resource,
    p.action,
    p.scope,
    p."isSystem"
FROM "role_permissions" rp 
JOIN roles r ON rp."roleId" = r.id 
JOIN permissions p ON rp."permissionId" = p.id 
WHERE r.name = 'Owner'
ORDER BY p.resource, p.action
LIMIT 20;

-- Permission Summary by Resource
SELECT 'Super Admin Permission Summary by Resource:' as info;
SELECT 
    p.resource,
    COUNT(*) as permission_count
FROM "role_permissions" rp 
JOIN roles r ON rp."roleId" = r.id 
JOIN permissions p ON rp."permissionId" = p.id 
WHERE r.name = 'Super Admin'
GROUP BY p.resource
ORDER BY p.resource;

-- Critical Permissions Check
SELECT 'Critical Permissions Check:' as info;
SELECT 
    'Super Admin has permissions:read' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM "role_permissions" rp 
            JOIN roles r ON rp."roleId" = r.id 
            JOIN permissions p ON rp."permissionId" = p.id 
            WHERE r.name = 'Super Admin' AND p.name = 'permissions:read'
        ) THEN '✅ YES'
        ELSE '❌ NO'
    END as result
UNION ALL
SELECT 
    'Owner has permissions:read' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM "role_permissions" rp 
            JOIN roles r ON rp."roleId" = r.id 
            JOIN permissions p ON rp."permissionId" = p.id 
            WHERE r.name = 'Owner' AND p.name = 'permissions:read'
        ) THEN '✅ YES'
        ELSE '❌ NO'
    END as result
UNION ALL
SELECT 
    'Super Admin has roles:read' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM "role_permissions" rp 
            JOIN roles r ON rp."roleId" = r.id 
            JOIN permissions p ON rp."permissionId" = p.id 
            WHERE r.name = 'Super Admin' AND p.name = 'roles:read'
        ) THEN '✅ YES'
        ELSE '❌ NO'
    END as result;

-- Final Summary
SELECT 'FINAL SUMMARY:' as info;
SELECT 
    'Total Active Permissions' as metric,
    COUNT(*) as count,
    '📊' as icon
FROM permissions 
WHERE "isActive" = true
UNION ALL
SELECT 
    'Super Admin Permissions' as metric,
    COUNT(*) as count,
    '🔐' as icon
FROM "role_permissions" rp 
JOIN roles r ON rp."roleId" = r.id 
WHERE r.name = 'Super Admin'
UNION ALL
SELECT 
    'Owner Permissions' as metric,
    COUNT(*) as count,
    '👑' as icon
FROM "role_permissions" rp 
JOIN roles r ON rp."roleId" = r.id 
WHERE r.name = 'Owner'
UNION ALL
SELECT 
    'Super Admin User Roles' as metric,
    COUNT(*) as count,
    '👤' as icon
FROM "user_roles" ur
JOIN users u ON ur."userId" = u.id
WHERE u.email = 'superadmin@example.com';

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================
SELECT '🎉 SUPER ADMIN PERMISSIONS MANAGER COMPLETED SUCCESSFULLY! 🎉' as status;
SELECT '=============================================================' as separator;
SELECT 'Next steps:' as info;
SELECT '1. Test login: curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d ''{"email":"superadmin@example.com","password":"SuperAdmin123!"}''' as step;
SELECT '2. Test permissions: ./scripts/test-super-admin-permissions.sh' as step;
SELECT '3. Access admin endpoints with full permissions' as step;