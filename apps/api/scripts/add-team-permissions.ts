import { AppDataSource } from '../src/database/data-source';
import { env } from '@app/config';

async function addTeamPermissions() {
  try {
    console.log('🔗 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    console.log('📝 Adding team permissions...');

    const permissions = [
      // Team CRUD permissions
      {
        name: 'teams:create',
        description: 'Create teams',
        resource: 'teams',
        action: 'create',
      },
      {
        name: 'teams:read',
        description: 'View teams',
        resource: 'teams',
        action: 'read',
      },
      {
        name: 'teams:update',
        description: 'Update teams',
        resource: 'teams',
        action: 'update',
      },
      {
        name: 'teams:delete',
        description: 'Delete teams',
        resource: 'teams',
        action: 'delete',
      },
      {
        name: 'teams:manage',
        description: 'Manage all team operations',
        resource: 'teams',
        action: 'manage',
      },

      // Team member permissions
      {
        name: 'team-members:add',
        description: 'Add team members',
        resource: 'teams',
        action: 'create',
      },
      {
        name: 'team-members:remove',
        description: 'Remove team members',
        resource: 'teams',
        action: 'delete',
      },
      {
        name: 'team-members:update',
        description: 'Update team member roles',
        resource: 'teams',
        action: 'update',
      },
      {
        name: 'team-members:read',
        description: 'View team members',
        resource: 'teams',
        action: 'read',
      },

      // Team invitation permissions
      {
        name: 'team-invitations:send',
        description: 'Send team invitations',
        resource: 'teams',
        action: 'create',
      },
      {
        name: 'team-invitations:cancel',
        description: 'Cancel team invitations',
        resource: 'teams',
        action: 'delete',
      },
      {
        name: 'team-invitations:read',
        description: 'View team invitations',
        resource: 'teams',
        action: 'read',
      },

      // Team analytics permissions
      {
        name: 'team-analytics:read',
        description: 'View team analytics',
        resource: 'analytics',
        action: 'read',
      },
    ];

    for (const permission of permissions) {
      const existingPermission = await AppDataSource.query(
        'SELECT id FROM permissions WHERE name = $1',
        [permission.name]
      );

      if (existingPermission.length === 0) {
        await AppDataSource.query(
          'INSERT INTO permissions (name, description, resource, action, scope, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
          [
            permission.name,
            permission.description,
            permission.resource,
            permission.action,
            'tenant',
          ]
        );
        console.log(`✅ Added permission: ${permission.name}`);
      } else {
        console.log(`⏭️  Permission already exists: ${permission.name}`);
      }
    }

    // Get role IDs
    const roles = await AppDataSource.query(
      'SELECT id, name FROM roles WHERE name IN ($1, $2, $3, $4, $5, $6)',
      ['Super Admin', 'Owner', 'Admin', 'Manager', 'Member', 'Viewer']
    );

    const roleMap = roles.reduce((acc: Record<string, string>, role: any) => {
      acc[role.name] = role.id;
      return acc;
    }, {});

    // Assign permissions to roles
    const rolePermissions = {
      'Super Admin': permissions.map(p => p.name),
      Owner: permissions.map(p => p.name),
      Admin: [
        'teams:create',
        'teams:read',
        'teams:update',
        'team-members:add',
        'team-members:remove',
        'team-members:update',
        'team-members:read',
        'team-invitations:send',
        'team-invitations:cancel',
        'team-invitations:read',
        'team-analytics:read',
      ],
      Manager: [
        'teams:read',
        'teams:update',
        'team-members:add',
        'team-members:read',
        'team-invitations:send',
        'team-invitations:read',
        'team-analytics:read',
      ],
      Member: ['teams:read', 'team-members:read', 'team-invitations:read'],
      Viewer: ['teams:read', 'team-members:read'],
    };

    for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
      const roleId = roleMap[roleName];
      if (!roleId) {
        console.log(`⚠️  Role not found: ${roleName}`);
        continue;
      }

      for (const permissionName of permissionNames) {
        const permission = await AppDataSource.query(
          'SELECT id FROM permissions WHERE name = $1',
          [permissionName]
        );

        if (permission.length > 0) {
          const existingRolePermission = await AppDataSource.query(
            'SELECT "roleId" FROM role_permissions WHERE "roleId" = $1 AND "permissionId" = $2',
            [roleId, permission[0].id]
          );

          if (existingRolePermission.length === 0) {
            await AppDataSource.query(
              'INSERT INTO role_permissions ("roleId", "permissionId") VALUES ($1, $2)',
              [roleId, permission[0].id]
            );
            console.log(`✅ Assigned ${permissionName} to ${roleName}`);
          } else {
            console.log(
              `⏭️  ${permissionName} already assigned to ${roleName}`
            );
          }
        }
      }
    }

    console.log('✅ Team permissions setup completed successfully');
  } catch (error) {
    console.error('❌ Error setting up team permissions:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
addTeamPermissions()
  .then(() => {
    console.log('🎉 Team permissions setup completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Team permissions setup failed:', error);
    process.exit(1);
  });
