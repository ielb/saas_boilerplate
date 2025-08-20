#!/usr/bin/env ts-node

/**
 * Comprehensive Database Seeding Script
 *
 * This script will:
 * 1. Insert all permissions based on the PermissionResource and PermissionAction enums
 * 2. Insert all system roles with proper hierarchy
 * 3. Create role-permission relationships
 * 4. Insert test users with different roles
 * 5. Create tenant memberships for users
 *
 * Usage:
 * cd apps/api && npx ts-node scripts/seed-database.ts
 */

import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

// Import entities and enums
import {
  Permission,
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../src/modules/auth/entities/permission.entity';
import {
  Role,
  RoleType,
  RoleLevel,
} from '../src/modules/auth/entities/role.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { Tenant } from '../src/modules/auth/entities/tenant.entity';
import { UserTenantMembership } from '../src/modules/auth/entities/user-tenant-membership.entity';
import {
  UserStatus,
  AuthProvider,
  MembershipStatus,
  UserRole,
} from '@app/shared';

// Database configuration
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'saas_user',
  password: process.env.DB_PASSWORD || 'saas_password',
  database: process.env.DB_DATABASE || 'saas_boilerplate',
  entities: [Permission, Role, User, Tenant, UserTenantMembership],
  synchronize: false,
  logging: false,
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message: string, color: keyof typeof colors = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message: string) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(message, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logStep(message: string) {
  log(`\n📋 ${message}`, 'blue');
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

// Test data configuration
const TEST_USERS: Array<{
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole | string;
  tenantName: string;
}> = [
  {
    email: 'superadmin@example.com',
    password: 'SuperAdmin123!',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'Super Admin', // Special case for Super Admin
    tenantName: 'System',
  },
  {
    email: 'admin@example.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.OWNER,
    tenantName: 'Acmac',
  },
  {
    email: 'manager@example.com',
    password: 'Manager123!',
    firstName: 'Manager',
    lastName: 'User',
    role: UserRole.MANAGER,
    tenantName: 'Acmac',
  },
  {
    email: 'member@example.com',
    password: 'Member123!',
    firstName: 'Member',
    lastName: 'User',
    role: UserRole.MEMBER,
    tenantName: 'Acmac',
  },
  {
    email: 'viewer@example.com',
    password: 'Viewer123!',
    firstName: 'Viewer',
    lastName: 'User',
    role: UserRole.VIEWER,
    tenantName: 'Acmac',
  },
];

class DatabaseSeeder {
  private permissionRepository: any;
  private roleRepository: any;
  private userRepository: any;
  private tenantRepository: any;
  private membershipRepository: any;

  async initialize() {
    logHeader('🚀 INITIALIZING DATABASE SEEDER');

    try {
      await dataSource.initialize();
      logSuccess('Database connection established');

      // Initialize repositories
      this.permissionRepository = dataSource.getRepository(Permission);
      this.roleRepository = dataSource.getRepository(Role);
      this.userRepository = dataSource.getRepository(User);
      this.tenantRepository = dataSource.getRepository(Tenant);
      this.membershipRepository =
        dataSource.getRepository(UserTenantMembership);

      logSuccess('Repositories initialized');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError(`Failed to initialize database: ${errorMessage}`);
      throw error;
    }
  }

  async seed() {
    logHeader('🌱 STARTING DATABASE SEEDING PROCESS');

    try {
      // Step 1: Create permissions
      await this.createPermissions();

      // Step 2: Create roles
      await this.createRoles();

      // Step 3: Assign permissions to roles
      await this.assignPermissionsToRoles();

      // Step 4: Create tenants
      await this.createTenants();

      // Step 5: Create users
      await this.createUsers();

      // Step 6: Create user-tenant memberships
      await this.createUserTenantMemberships();

      logHeader('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
      await this.printSummary();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError(`Seeding failed: ${errorMessage}`);
      throw error;
    }
  }

  private async createPermissions() {
    logStep('Creating Permissions');

    const permissions = this.generateAllPermissions();
    let createdCount = 0;
    let skippedCount = 0;

    for (const permissionData of permissions) {
      const existingPermission = await this.permissionRepository.findOne({
        where: {
          name: permissionData.name,
          resource: permissionData.resource,
          action: permissionData.action,
        },
      });

      if (!existingPermission) {
        const permission = this.permissionRepository.create(permissionData);
        await this.permissionRepository.save(permission);
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    logSuccess(
      `Permissions created: ${createdCount}, skipped: ${skippedCount}`
    );
  }

  private generateAllPermissions(): Partial<Permission>[] {
    const permissions: Partial<Permission>[] = [];

    // Generate permissions for each resource and action combination
    Object.values(PermissionResource).forEach(resource => {
      Object.values(PermissionAction).forEach(action => {
        // Determine scope based on resource
        let scope = PermissionScope.TENANT;
        if (
          resource === PermissionResource.TENANTS ||
          resource === PermissionResource.SYSTEM_SETTINGS
        ) {
          scope = PermissionScope.GLOBAL;
        }

        permissions.push({
          name: `${resource}:${action}`,
          resource,
          action,
          scope,
          description: `${action} permission for ${resource}`,
          isActive: true,
        });
      });
    });

    return permissions;
  }

  private async createRoles() {
    logStep('Creating Roles');

    const roles = [
      {
        name: 'Super Admin',
        description: 'Ultimate system administrator with ALL permissions',
        level: RoleLevel.OWNER,
        type: RoleType.SYSTEM,
        isSystem: true,
        isActive: true,
      },
      {
        name: 'Owner',
        description: 'Tenant owner with full access to all tenant resources',
        level: RoleLevel.OWNER,
        type: RoleType.SYSTEM,
        isSystem: true,
        isActive: true,
      },
      {
        name: 'Admin',
        description:
          'Administrator with management permissions, no system settings',
        level: RoleLevel.ADMIN,
        type: RoleType.SYSTEM,
        isSystem: true,
        isActive: true,
      },
      {
        name: 'Manager',
        description: 'Team manager with user and team management permissions',
        level: RoleLevel.MANAGER,
        type: RoleType.SYSTEM,
        isSystem: true,
        isActive: true,
      },
      {
        name: 'Member',
        description: 'Regular member with basic operational permissions',
        level: RoleLevel.MEMBER,
        type: RoleType.SYSTEM,
        isSystem: true,
        isActive: true,
      },
      {
        name: 'Viewer',
        description: 'Read-only access to assigned resources',
        level: RoleLevel.VIEWER,
        type: RoleType.SYSTEM,
        isSystem: true,
        isActive: true,
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const roleData of roles) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
        createdCount++;
        logSuccess(`Created role: ${roleData.name}`);
      } else {
        skippedCount++;
        logWarning(`Role already exists: ${roleData.name}`);
      }
    }

    logSuccess(`Roles created: ${createdCount}, skipped: ${skippedCount}`);
  }

  private async assignPermissionsToRoles() {
    logStep('Assigning Permissions to Roles');

    // First, clear all existing role-permission relationships to avoid foreign key issues
    logStep('Clearing existing role-permission relationships');

    // Clear the role_permissions table directly
    await this.roleRepository.query('DELETE FROM role_permissions');

    const rolePermissionMap = await this.getRolePermissionMapping();
    let assignmentCount = 0;

    for (const [roleName, permissionNames] of Object.entries(
      rolePermissionMap
    )) {
      const role = await this.roleRepository.findOne({
        where: { name: roleName },
        relations: ['permissions'],
      });

      if (!role) {
        logWarning(`Role not found: ${roleName}`);
        continue;
      }

      const permissions = await this.permissionRepository.find({
        where: permissionNames.map(name => ({ name })),
      });

      if (permissions.length === 0) {
        logWarning(`No permissions found for role: ${roleName}`);
        logWarning(
          `Looking for permissions: ${permissionNames.slice(0, 5).join(', ')}...`
        );

        // Get all available permissions to see what exists
        const allPermissions = await this.permissionRepository.find();
        logWarning(
          `Available permissions: ${allPermissions
            .slice(0, 5)
            .map((p: Permission) => p.name)
            .join(', ')}...`
        );
        continue;
      }

      // Verify all permissions exist and have valid IDs
      const validPermissions = permissions.filter(
        (p: Permission) => p.id && p.id.length > 0
      );
      if (validPermissions.length !== permissions.length) {
        logWarning(
          `Some permissions for ${roleName} have invalid IDs, skipping invalid ones`
        );
      }

      if (validPermissions.length === 0) {
        logWarning(`No valid permissions found for role: ${roleName}`);
        continue;
      }

      try {
        // Insert role-permission relationships directly into the table
        const roleId = role.id;
        const permissionIds = validPermissions.map((p: Permission) => p.id);

        // Create the insert statements
        const insertPromises = permissionIds.map((permissionId: string) =>
          this.roleRepository.query(
            'INSERT INTO role_permissions ("roleId", "permissionId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [roleId, permissionId]
          )
        );

        await Promise.all(insertPromises);
        assignmentCount++;

        // Log team permissions specifically
        const teamPermissions = validPermissions.filter((p: Permission) =>
          p.name.startsWith('teams:')
        );

        if (teamPermissions.length > 0) {
          logSuccess(
            `Assigned ${validPermissions.length} permissions to ${roleName} (including ${teamPermissions.length} team permissions)`
          );
          log(
            `   Team permissions: ${teamPermissions.map((p: Permission) => p.name).join(', ')}`,
            'cyan'
          );
        } else {
          logSuccess(
            `Assigned ${validPermissions.length} permissions to ${roleName}`
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        logError(
          `Failed to assign permissions to ${roleName}: ${errorMessage}`
        );

        // Log the permission IDs being assigned for debugging
        const permissionIds = validPermissions.map((p: Permission) => p.id);
        logWarning(
          `Attempting to assign permission IDs: ${permissionIds.slice(0, 5).join(', ')}...`
        );

        // Continue with next role instead of failing completely
        continue;
      }
    }

    logSuccess(`Permission assignments completed: ${assignmentCount} roles`);
  }

  private async getRolePermissionMapping(): Promise<Record<string, string[]>> {
    // Get all existing permissions from database
    const allPermissions = await this.permissionRepository.find();
    const allPermissionNames = allPermissions.map((p: Permission) => p.name);

    return {
      'Super Admin': allPermissionNames,
      Owner: allPermissionNames,
      Admin: allPermissionNames.filter(
        (name: string) =>
          !name.includes('system_settings:') && !name.includes('tenants:')
      ),
      Manager: allPermissionNames.filter((name: string) =>
        ['users:', 'teams:', 'files:', 'notifications:', 'reports:'].some(
          prefix => name.startsWith(prefix)
        )
      ),
      Member: allPermissionNames.filter(
        (name: string) =>
          ['files:', 'notifications:', 'reports:', 'sessions:', 'teams:'].some(
            prefix => name.startsWith(prefix)
          ) &&
          ['create', 'read', 'update', 'export'].some(action =>
            name.endsWith(`:${action}`)
          )
      ),
      Viewer: allPermissionNames.filter(
        (name: string) =>
          ['read', 'export'].some(action => name.endsWith(`:${action}`)) &&
          ['files:', 'teams:', 'reports:'].some(prefix =>
            name.startsWith(prefix)
          )
      ),
    };
  }

  private async createTenants() {
    logStep('Creating Tenants');

    // Get unique tenant names
    const uniqueTenantNames = [
      ...new Set(TEST_USERS.map(user => user.tenantName)),
    ];

    const tenants = uniqueTenantNames.map(tenantName => ({
      name: tenantName,
      slug: tenantName.toLowerCase().replace(/\s+/g, '-'),
      description:
        tenantName === 'System'
          ? 'System administration tenant for Super Admin'
          : 'Main tenant for all other users',
      isActive: true,
      contactEmail:
        tenantName === 'System'
          ? 'superadmin@example.com'
          : 'admin@example.com',
      contactPhone: '+1234567890',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
      },
      settings: {
        timezone: 'UTC',
        locale: 'en-US',
        currency: 'USD',
      },
    }));

    let createdCount = 0;
    let skippedCount = 0;

    for (const tenantData of tenants) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { name: tenantData.name },
      });

      if (!existingTenant) {
        const tenant = this.tenantRepository.create(tenantData);
        await this.tenantRepository.save(tenant);
        createdCount++;
        logSuccess(`Created tenant: ${tenantData.name}`);
      } else {
        skippedCount++;
        logWarning(`Tenant already exists: ${tenantData.name}`);
      }
    }

    logSuccess(`Tenants created: ${createdCount}, skipped: ${skippedCount}`);
  }

  private async createUsers() {
    logStep('Creating Users');

    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of TEST_USERS) {
      const existingUser = await this.userRepository.findOne({
        where: { email: userData.email },
      });

      if (!existingUser) {
        const hashedPassword = await argon2.hash(userData.password);
        const tenant = await this.tenantRepository.findOne({
          where: { name: userData.tenantName },
        });

        if (!tenant) {
          logError(`Tenant not found for user: ${userData.email}`);
          continue;
        }

        // Convert role name to UserRole enum value
        const userRole = this.getUserRoleFromRoleName(userData.role);

        const user = this.userRepository.create({
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          tenantId: tenant.id,
          role: userRole,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          authProvider: AuthProvider.LOCAL,
        });

        await this.userRepository.save(user);
        createdCount++;
        logSuccess(`Created user: ${userData.email}`);
      } else {
        skippedCount++;
        logWarning(`User already exists: ${userData.email}`);
      }
    }

    logSuccess(`Users created: ${createdCount}, skipped: ${skippedCount}`);
  }

  private async createUserTenantMemberships() {
    logStep('Creating User-Tenant Memberships');

    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of TEST_USERS) {
      const user = await this.userRepository.findOne({
        where: { email: userData.email },
      });

      const tenant = await this.tenantRepository.findOne({
        where: { name: userData.tenantName },
      });

      if (!user || !tenant) {
        logError(`User or tenant not found for: ${userData.email}`);
        continue;
      }

      const existingMembership = await this.membershipRepository.findOne({
        where: { userId: user.id, tenantId: tenant.id },
      });

      if (!existingMembership) {
        const membership = this.membershipRepository.create({
          userId: user.id,
          tenantId: tenant.id,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
        });

        await this.membershipRepository.save(membership);
        createdCount++;
        logSuccess(`Created membership for: ${userData.email}`);
      } else {
        skippedCount++;
        logWarning(
          `Membership already exists for: ${userData.email} in ${tenant.name}`
        );
      }
    }

    logSuccess(
      `Memberships created: ${createdCount}, skipped: ${skippedCount}`
    );
  }

  private getRoleNameFromUserRole(userRole: UserRole): string {
    switch (userRole) {
      case UserRole.OWNER:
        return 'Owner';
      case UserRole.ADMIN:
        return 'Admin';
      case UserRole.MANAGER:
        return 'Manager';
      case UserRole.MEMBER:
        return 'Member';
      case UserRole.VIEWER:
        return 'Viewer';
      default:
        return 'Member'; // Default fallback
    }
  }

  private getUserRoleFromRoleName(roleName: UserRole | string): UserRole {
    if (typeof roleName === 'string') {
      switch (roleName) {
        case 'Super Admin':
          return UserRole.ADMIN; // Map Super Admin to ADMIN enum
        case 'Owner':
          return UserRole.OWNER;
        case 'Admin':
          return UserRole.ADMIN;
        case 'Manager':
          return UserRole.MANAGER;
        case 'Member':
          return UserRole.MEMBER;
        case 'Viewer':
          return UserRole.VIEWER;
        case 'owner':
          return UserRole.OWNER;
        case 'admin':
          return UserRole.ADMIN;
        case 'manager':
          return UserRole.MANAGER;
        case 'member':
          return UserRole.MEMBER;
        case 'viewer':
          return UserRole.VIEWER;
        default:
          return UserRole.MEMBER; // Default fallback
      }
    }
    // If it's already a UserRole enum value, return it directly
    return roleName as UserRole;
  }

  private async printSummary() {
    logHeader('📊 SEEDING SUMMARY');

    log('🔐 Test Users Created:', 'bright');
    TEST_USERS.forEach(user => {
      log(
        `   ${user.email} (${user.role}) - Password: ${user.password}`,
        'green'
      );
    });

    // Show team permissions for each role
    log('\n👥 Team Permissions by Role:', 'bright');
    const roles = await this.roleRepository.find({
      relations: ['permissions'],
    });

    for (const role of roles) {
      const teamPermissions =
        role.permissions?.filter((p: Permission) =>
          p.name.startsWith('teams:')
        ) || [];

      if (teamPermissions.length > 0) {
        log(
          `   ${role.name}: ${teamPermissions.length} team permissions`,
          'green'
        );
        log(
          `     ${teamPermissions.map((p: Permission) => p.name).join(', ')}`,
          'cyan'
        );
      } else {
        log(`   ${role.name}: No team permissions`, 'yellow');
      }
    }

    log('\n🎯 Next Steps:', 'bright');
    log('   1. Test login with any of the created users', 'cyan');
    log('   2. Verify permissions and role assignments', 'cyan');
    log('   3. Test API endpoints with different user roles', 'cyan');
    log('   4. Test team functionality with admin and manager users', 'cyan');

    log('\n🔗 Quick Test Commands:', 'bright');
    log('   # SuperAdmin login', 'yellow');
    log('   curl -X POST http://localhost:3001/api/auth/login \\', 'cyan');
    log('     -H "Content-Type: application/json" \\', 'cyan');
    log(
      '     -d \'{"email":"superadmin@example.com","password":"SuperAdmin123!"}\'',
      'cyan'
    );

    log('\n   # Admin login', 'yellow');
    log('   curl -X POST http://localhost:3001/api/auth/login \\', 'cyan');
    log('     -H "Content-Type: application/json" \\', 'cyan');
    log(
      '     -d \'{"email":"admin@example.com","password":"Admin123!"}\'',
      'cyan'
    );

    log('\n   # Manager login (has team permissions)', 'yellow');
    log('   curl -X POST http://localhost:3001/api/auth/login \\', 'cyan');
    log('     -H "Content-Type: application/json" \\', 'cyan');
    log(
      '     -d \'{"email":"manager@example.com","password":"Manager123!"}\'',
      'cyan'
    );
  }

  async cleanup() {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      logSuccess('Database connection closed');
    }
  }
}

// Main execution
async function main() {
  const seeder = new DatabaseSeeder();

  try {
    await seeder.initialize();
    await seeder.seed();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError(`Seeding failed: ${errorMessage}`);
    process.exit(1);
  } finally {
    await seeder.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DatabaseSeeder };
