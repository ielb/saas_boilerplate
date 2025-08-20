-- Add team permissions to the system
-- This script adds team-related permissions to the existing role hierarchy

-- Insert team permissions
INSERT INTO permissions (name, description, resource, action, "isSystem", "isActive", "createdAt", "updatedAt")
VALUES 
  ('teams:create', 'Create teams', 'teams', 'create', true, true, NOW(), NOW()),
  ('teams:read', 'Read teams', 'teams', 'read', true, true, NOW(), NOW()),
  ('teams:update', 'Update teams', 'teams', 'update', true, true, NOW(), NOW()),
  ('teams:delete', 'Delete teams', 'teams', 'delete', true, true, NOW(), NOW()),
  ('teams:manage', 'Manage teams (add/remove members, invitations)', 'teams', 'manage', true, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Get permission IDs
DO $$
DECLARE
  teams_create_id UUID;
  teams_read_id UUID;
  teams_update_id UUID;
  teams_delete_id UUID;
  teams_manage_id UUID;
BEGIN
  -- Get permission IDs
  SELECT id INTO teams_create_id FROM permissions WHERE name = 'teams:create';
  SELECT id INTO teams_read_id FROM permissions WHERE name = 'teams:read';
  SELECT id INTO teams_update_id FROM permissions WHERE name = 'teams:update';
  SELECT id INTO teams_delete_id FROM permissions WHERE name = 'teams:delete';
  SELECT id INTO teams_manage_id FROM permissions WHERE name = 'teams:manage';

  -- Add permissions to Super Admin (all permissions)
  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_create_id FROM roles r WHERE r.name = 'Super Admin'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_read_id FROM roles r WHERE r.name = 'Super Admin'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_update_id FROM roles r WHERE r.name = 'Super Admin'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_delete_id FROM roles r WHERE r.name = 'Super Admin'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_manage_id FROM roles r WHERE r.name = 'Super Admin'
  ON CONFLICT DO NOTHING;

  -- Add permissions to Owner (all permissions)
  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_create_id FROM roles r WHERE r.name = 'Owner'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_read_id FROM roles r WHERE r.name = 'Owner'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_update_id FROM roles r WHERE r.name = 'Owner'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_delete_id FROM roles r WHERE r.name = 'Owner'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_manage_id FROM roles r WHERE r.name = 'Owner'
  ON CONFLICT DO NOTHING;

  -- Add permissions to Admin (all team permissions)
  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_create_id FROM roles r WHERE r.name = 'Admin'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_read_id FROM roles r WHERE r.name = 'Admin'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_update_id FROM roles r WHERE r.name = 'Admin'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_delete_id FROM roles r WHERE r.name = 'Admin'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_manage_id FROM roles r WHERE r.name = 'Admin'
  ON CONFLICT DO NOTHING;

  -- Add permissions to Manager (read and manage teams)
  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_read_id FROM roles r WHERE r.name = 'Manager'
  ON CONFLICT DO NOTHING;

  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_manage_id FROM roles r WHERE r.name = 'Manager'
  ON CONFLICT DO NOTHING;

  -- Add permissions to Member (read teams only)
  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_read_id FROM roles r WHERE r.name = 'Member'
  ON CONFLICT DO NOTHING;

  -- Add permissions to Viewer (read teams only)
  INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, teams_read_id FROM roles r WHERE r.name = 'Viewer'
  ON CONFLICT DO NOTHING;

END $$;

-- Display updated permission counts
SELECT 
  r.name as role_name,
  COUNT(rp."permissionId") as permission_count
FROM roles r
LEFT JOIN "role_permissions" rp ON r.id = rp."roleId"
WHERE r."isSystem" = true
GROUP BY r.id, r.name
ORDER BY r.level, r.name;
