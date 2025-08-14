# 🔐 Role Hierarchy & Permissions Guide

## Overview

This document describes the comprehensive role hierarchy implemented in the SaaS Boilerplate system. The role system provides granular access control with 6 distinct roles, each with specific permissions and responsibilities.

## 🏗️ Role Hierarchy

### Level 1: System Administrators

- **🔐 Super Admin** - Ultimate system administrator with ALL permissions
- **👑 Owner** - Tenant owner with full access to all tenant resources

### Level 2: Management

- **⚙️ Admin** - Administrator with management permissions, no system settings

### Level 3: Team Management

- **👥 Manager** - Team manager with user and team management permissions

### Level 4: Operations

- **📝 Member** - Regular member with basic operational permissions

### Level 5: Read-Only

- **👁️ Viewer** - Read-only access to assigned resources

## 📊 Permission Summary

| Role            | Level | Permissions | Description                          |
| --------------- | ----- | ----------- | ------------------------------------ |
| **Super Admin** | 1     | 132         | 🔐 ALL PERMISSIONS                   |
| **Owner**       | 1     | 132         | 👑 ALL PERMISSIONS (tenant-specific) |
| **Admin**       | 2     | 121         | ⚙️ MANAGEMENT (no system settings)   |
| **Manager**     | 3     | 55          | 👥 TEAM MANAGEMENT                   |
| **Member**      | 4     | 16          | 📝 BASIC OPERATIONS                  |
| **Viewer**      | 5     | 24          | 👁️ READ-ONLY                         |

## 🔑 Detailed Role Permissions

### 🔐 Super Admin (Level 1)

**Permissions**: 132 total - ALL system permissions

**Capabilities**:

- Full system access and control
- Can manage all tenants, users, roles, and permissions
- Can access system settings and configurations
- Can perform any action on any resource
- Can create, modify, and delete any system component

**Use Cases**:

- System administrators
- Platform owners
- Emergency access scenarios

### 👑 Owner (Level 1)

**Permissions**: 132 total - ALL permissions (tenant-specific)

**Capabilities**:

- Full access to all tenant resources
- Can manage users, roles, and permissions within their tenant
- Can configure tenant-specific settings
- Cannot access system-level settings (reserved for Super Admin)

**Use Cases**:

- Tenant owners
- Organization administrators
- Primary account holders

### ⚙️ Admin (Level 2)

**Permissions**: 121 total - Management permissions (no system settings)

**Capabilities**:

- Can manage users, roles, teams, and most resources
- Cannot access system settings
- Can approve/reject operations
- Can import/export data
- Can assign/revoke permissions

**Resources Accessible**:

- ✅ users (all actions except system settings)
- ✅ roles (all actions)
- ✅ permissions (all actions)
- ✅ tenants (all actions)
- ✅ teams (all actions)
- ✅ sessions (all actions)
- ✅ billing (all actions)
- ✅ subscriptions (all actions)
- ✅ files (all actions)
- ✅ notifications (all actions)
- ✅ reports (all actions)
- ❌ system_settings (no access)

**Use Cases**:

- Department administrators
- IT managers
- Senior managers

### 👥 Manager (Level 3)

**Permissions**: 55 total - Team and user management

**Capabilities**:

- Can manage teams and team members
- Can manage users within their scope
- Can handle files, notifications, and reports
- Cannot access billing or system settings

**Resources Accessible**:

- ✅ users (all actions)
- ✅ teams (all actions)
- ✅ files (all actions)
- ✅ notifications (all actions)
- ✅ reports (all actions)
- ❌ roles (no access)
- ❌ permissions (no access)
- ❌ tenants (no access)
- ❌ sessions (no access)
- ❌ billing (no access)
- ❌ subscriptions (no access)
- ❌ system_settings (no access)

**Use Cases**:

- Team leaders
- Project managers
- Department supervisors

### 📝 Member (Level 4)

**Permissions**: 16 total - Basic operations

**Capabilities**:

- Can create, read, update, and export basic resources
- Cannot delete or manage other users
- Limited to operational tasks

**Resources Accessible**:

- ✅ files (create, read, update, export)
- ✅ notifications (create, read, update, export)
- ✅ reports (create, read, update, export)
- ✅ sessions (create, read, update, export)
- ❌ users (no access)
- ❌ teams (no access)
- ❌ roles (no access)
- ❌ permissions (no access)
- ❌ tenants (no access)
- ❌ billing (no access)
- ❌ subscriptions (no access)
- ❌ system_settings (no access)

**Use Cases**:

- Regular employees
- Content creators
- Report generators

### 👁️ Viewer (Level 5)

**Permissions**: 24 total - Read-only access

**Capabilities**:

- Can only read and export data
- Cannot create, update, or delete anything
- Limited to viewing assigned resources

**Resources Accessible**:

- ✅ All resources (read and export only)
- ❌ No create, update, delete, or manage permissions

**Use Cases**:

- Auditors
- Consultants
- External reviewers
- Read-only users

## 🎯 Permission Categories

### Action Types

- **create** - Can create new resources
- **read** - Can view existing resources
- **update** - Can modify existing resources
- **delete** - Can remove resources
- **manage** - Can perform administrative actions
- **approve** - Can approve operations
- **reject** - Can reject operations
- **export** - Can export data
- **import** - Can import data
- **assign** - Can assign permissions/roles
- **revoke** - Can revoke permissions/roles

### Resource Types

- **users** - User management
- **roles** - Role management
- **permissions** - Permission management
- **tenants** - Tenant management
- **teams** - Team management
- **sessions** - Session management
- **billing** - Billing operations
- **subscriptions** - Subscription management
- **files** - File management
- **notifications** - Notification management
- **reports** - Report generation
- **system_settings** - System configuration

## 🚀 Implementation

### Database Setup

The role hierarchy is created using the comprehensive SQL script:

```bash
# Run the role setup script
docker exec -i saas-postgres psql -U saas_user -d saas_boilerplate < scripts/super-admin-permissions-manager.sql
```

### Creating Users with Specific Roles

```bash
# Example: Create an Admin user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!",
    "firstName": "Admin",
    "lastName": "User",
    "tenantName": "My Company",
    "acceptTerms": true
  }'

# Then assign Admin role via database
docker exec -i saas-postgres psql -U saas_user -d saas_boilerplate \
  -c "INSERT INTO \"user_roles\" (\"userId\", \"roleId\")
      SELECT u.id, r.id FROM users u CROSS JOIN roles r
      WHERE u.email = 'admin@example.com' AND r.name = 'Admin';"
```

### Testing Role Permissions

```bash
# Test Super Admin permissions
./scripts/test-super-admin-permissions.sh

# Test specific role permissions
curl -X GET http://localhost:3001/api/roles/debug/user-permissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔒 Security Considerations

### Principle of Least Privilege

- Each role has only the minimum permissions necessary for their function
- Higher-level roles inherit permissions from lower levels
- System settings are restricted to Super Admin only

### Role Inheritance

- Level 1 roles have access to everything
- Level 2+ roles have progressively restricted access
- Each level builds upon the previous level's permissions

### Audit Trail

- All permission changes are logged
- Role assignments are tracked
- User actions are audited based on their role

## 📋 Best Practices

### Role Assignment

1. **Start with Viewer** - Assign the lowest level role initially
2. **Promote Gradually** - Increase permissions as needed
3. **Regular Review** - Audit role assignments periodically
4. **Temporary Elevation** - Use temporary role assignments for specific tasks

### Permission Management

1. **Document Changes** - Keep records of permission modifications
2. **Test Permissions** - Verify role permissions before deployment
3. **Monitor Usage** - Track how permissions are being used
4. **Clean Up** - Remove unused roles and permissions

### User Onboarding

1. **Default Role** - Assign Viewer role to new users
2. **Training** - Educate users about their role responsibilities
3. **Escalation** - Provide clear escalation paths for permission requests
4. **Review** - Regular review of user role assignments

## 🛠️ Customization

### Adding Custom Roles

To add custom roles with specific permissions:

```sql
-- Create custom role
INSERT INTO roles (name, description, level, type, "isSystem", "isActive", "createdAt", "updatedAt")
VALUES ('Custom Role', 'Description', '3'::roles_level_enum, 'custom', false, true, NOW(), NOW());

-- Assign specific permissions
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'Custom Role' AND p.name IN ('users:read', 'files:create', 'reports:export');
```

### Modifying Existing Roles

To modify permissions for existing roles:

```sql
-- Remove specific permissions
DELETE FROM "role_permissions" rp
JOIN roles r ON rp."roleId" = r.id
JOIN permissions p ON rp."permissionId" = p.id
WHERE r.name = 'Manager' AND p.name = 'users:delete';

-- Add specific permissions
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'Manager' AND p.name = 'users:approve';
```

## 📞 Support

For questions about role hierarchy and permissions:

- Check the API documentation for endpoint-specific permissions
- Review the audit logs for permission changes
- Contact system administrators for role modifications
- Use the debug endpoint to verify user permissions

---

**Last Updated**: August 2025  
**Version**: 1.0  
**Author**: SaaS Boilerplate Team
