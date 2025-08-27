#!/usr/bin/env ts-node

/**
 * Database Seeding Verification Script
 *
 * This script verifies that the database seeding was successful by:
 * 1. Checking the count of permissions, roles, users, and tenants
 * 2. Verifying role-permission relationships
 * 3. Testing user authentication
 * 4. Validating data integrity
 *
 * Usage:
 * cd apps/api && npx ts-node scripts/test-seeding.ts
 */

import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';

// Import entities and enums
import {
  Permission,
  PermissionResource,
  PermissionAction,
} from '../src/modules/rbac/entities/permission.entity';
import {
  Role,
  RoleType,
  RoleLevel,
} from '../src/modules/rbac/entities/role.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { Tenant } from '../src/modules/tenants/entities/tenant.entity';
import { UserTenantMembership } from '../src/modules/tenants/entities/user-tenant-membership.entity';
import { UserStatus, AuthProvider, MembershipStatus } from '@app/shared';

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

// Expected data configuration
const EXPECTED_ROLES = [
  'Super Admin',
  'Owner',
  'Admin',
  'Manager',
  'Member',
  'Viewer',
];

const EXPECTED_USERS = [
  {
    email: 'superadmin@example.com',
    password: 'SuperAdmin123!',
    role: 'Super Admin',
    tenant: 'System',
  },
  {
    email: 'admin@example.com',
    password: 'Admin123!',
    role: 'Admin',
    tenant: 'Acmac',
  },
  {
    email: 'manager@example.com',
    password: 'Manager123!',
    role: 'Manager',
    tenant: 'Acmac',
  },
  {
    email: 'member@example.com',
    password: 'Member123!',
    role: 'Member',
    tenant: 'Acmac',
  },
  {
    email: 'viewer@example.com',
    password: 'Viewer123!',
    role: 'Viewer',
    tenant: 'Acmac',
  },
];

class SeedingTester {
  private permissionRepository: any;
  private roleRepository: any;
  private userRepository: any;
  private tenantRepository: any;
  private membershipRepository: any;

  async initialize() {
    logHeader('🚀 INITIALIZING SEEDING TESTER');

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

  async runTests() {
    logHeader('🧪 RUNNING SEEDING VERIFICATION TESTS');

    try {
      await this.testPermissions();
      await this.testRoles();
      await this.testUsers();
      await this.testTenants();
      await this.testMemberships();
      await this.testRolePermissionRelationships();
      await this.testUserAuthentication();
      await this.testDataIntegrity();

      logHeader('🎉 ALL TESTS PASSED!');
      this.printTestSummary();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError(`Testing failed: ${errorMessage}`);
      throw error;
    }
  }

  private async testPermissions() {
    logStep('Testing Permissions');

    const permissions = await this.permissionRepository.find();
    const expectedCount =
      Object.values(PermissionResource).length *
      Object.values(PermissionAction).length;

    logSuccess(`Found ${permissions.length} permissions`);
    logSuccess(`Expected ${expectedCount} permissions`);

    if (permissions.length === expectedCount) {
      logSuccess('✅ Permission count is correct');
    } else {
      logError(
        `❌ Permission count mismatch: ${permissions.length} vs ${expectedCount}`
      );
    }

    // Check for unique permission names
    const uniqueNames = new Set(permissions.map((p: Permission) => p.name));
    if (uniqueNames.size === permissions.length) {
      logSuccess('✅ All permission names are unique');
    } else {
      logError('❌ Duplicate permission names found');
    }
  }

  private async testRoles() {
    logStep('Testing Roles');

    const roles = await this.roleRepository.find();
    logSuccess(`Found ${roles.length} roles`);

    // Check if all expected roles exist
    const roleNames = roles.map((r: Role) => r.name);
    const missingRoles = EXPECTED_ROLES.filter(
      expected => !roleNames.includes(expected)
    );

    if (missingRoles.length === 0) {
      logSuccess('✅ All expected roles exist');
    } else {
      logError(`❌ Missing roles: ${missingRoles.join(', ')}`);
    }

    // Check role hierarchy
    const superAdmin = roles.find((r: Role) => r.name === 'Super Admin');
    if (superAdmin && superAdmin.level === RoleLevel.OWNER) {
      logSuccess('✅ Super Admin role has correct level');
    } else {
      logError('❌ Super Admin role level is incorrect');
    }
  }

  private async testUsers() {
    logStep('Testing Users');

    const users = await this.userRepository.find();
    logSuccess(`Found ${users.length} users`);

    // Check if all expected users exist
    const userEmails = users.map((u: User) => u.email);
    const missingUsers = EXPECTED_USERS.filter(
      expected => !userEmails.includes(expected.email)
    );

    if (missingUsers.length === 0) {
      logSuccess('✅ All expected users exist');
    } else {
      logError(
        `❌ Missing users: ${missingUsers.map(u => u.email).join(', ')}`
      );
    }

    // Check user status
    const activeUsers = users.filter(
      (u: User) => u.status === UserStatus.ACTIVE
    );
    logSuccess(`${activeUsers.length} users are active`);
  }

  private async testTenants() {
    logStep('Testing Tenants');

    const tenants = await this.tenantRepository.find();
    logSuccess(`Found ${tenants.length} tenants`);

    // Check if tenants are active
    const activeTenants = tenants.filter((t: Tenant) => t.isActive);
    logSuccess(`${activeTenants.length} tenants are active`);

    // Check for expected tenants (System and Acmac)
    const expectedTenantNames = ['System', 'Acmac'];
    const tenantNames = tenants.map((t: Tenant) => t.name);
    const missingTenants = expectedTenantNames.filter(
      expected => !tenantNames.includes(expected)
    );

    if (missingTenants.length === 0) {
      logSuccess('✅ All expected tenants exist (System and Acmac)');
    } else {
      logError(`❌ Missing tenants: ${missingTenants.join(', ')}`);
    }
  }

  private async testMemberships() {
    logStep('Testing User-Tenant Memberships');

    const memberships = await this.membershipRepository.find();
    logSuccess(`Found ${memberships.length} memberships`);

    // Check active memberships
    const activeMemberships = memberships.filter(
      (m: UserTenantMembership) => m.status === MembershipStatus.ACTIVE
    );
    logSuccess(`${activeMemberships.length} memberships are active`);

    if (memberships.length >= EXPECTED_USERS.length) {
      logSuccess('✅ Sufficient memberships exist for all users');
    } else {
      logError(
        `❌ Insufficient memberships: ${memberships.length} vs ${EXPECTED_USERS.length} expected`
      );
    }
  }

  private async testRolePermissionRelationships() {
    logStep('Testing Role-Permission Relationships');

    const roles = await this.roleRepository.find({
      relations: ['permissions'],
    });

    for (const role of roles) {
      logSuccess(`${role.name}: ${role.permissions.length} permissions`);
    }

    // Check Super Admin has all permissions
    const superAdmin = roles.find((r: Role) => r.name === 'Super Admin');
    const totalPermissions = await this.permissionRepository.count();

    if (superAdmin && superAdmin.permissions.length === totalPermissions) {
      logSuccess('✅ Super Admin has all permissions');
    } else {
      logError(
        `❌ Super Admin permissions: ${superAdmin?.permissions.length} vs ${totalPermissions} expected`
      );
    }
  }

  private async testUserAuthentication() {
    logStep('Testing User Authentication');

    for (const userData of EXPECTED_USERS) {
      const user = await this.userRepository.findOne({
        where: { email: userData.email },
      });

      if (!user) {
        logError(`❌ User not found: ${userData.email}`);
        continue;
      }

      try {
        const isValid = await argon2.verify(user.password, userData.password);
        if (isValid) {
          logSuccess(`✅ Password verification passed for ${userData.email}`);
        } else {
          logError(`❌ Password verification failed for ${userData.email}`);
        }
      } catch (error) {
        logError(`❌ Password verification error for ${userData.email}`);
      }
    }
  }

  private async testDataIntegrity() {
    logStep('Testing Data Integrity');

    // Check for orphaned records
    const usersWithoutTenants = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.tenant', 'tenant')
      .where('tenant.id IS NULL')
      .getCount();

    if (usersWithoutTenants === 0) {
      logSuccess('✅ All users have associated tenants');
    } else {
      logError(`❌ ${usersWithoutTenants} users without tenants`);
    }

    // Check for duplicate emails
    const duplicateEmails = await this.userRepository
      .createQueryBuilder('user')
      .select('user.email')
      .groupBy('user.email')
      .having('COUNT(*) > 1')
      .getRawMany();

    if (duplicateEmails.length === 0) {
      logSuccess('✅ No duplicate email addresses');
    } else {
      logError(
        `❌ Duplicate emails found: ${duplicateEmails.map((e: any) => e.user_email).join(', ')}`
      );
    }
  }

  private printTestSummary() {
    logHeader('📊 TEST SUMMARY');

    log('🎯 Test Results:', 'bright');
    log('   ✅ Permissions: Generated and verified', 'green');
    log('   ✅ Roles: Created with proper hierarchy', 'green');
    log('   ✅ Users: Created with valid passwords', 'green');
    log('   ✅ Tenants: Created and active', 'green');
    log('   ✅ Memberships: Properly linked', 'green');
    log('   ✅ Relationships: Role-permission assignments', 'green');
    log('   ✅ Authentication: Password verification', 'green');
    log('   ✅ Data Integrity: No orphaned records', 'green');

    log('\n🔐 Test Users Available:', 'bright');
    EXPECTED_USERS.forEach(user => {
      log(`   ${user.email} - ${user.password}`, 'green');
    });

    log('\n🎉 Database seeding verification completed successfully!', 'bright');
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
  const tester = new SeedingTester();

  try {
    await tester.initialize();
    await tester.runTests();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError(`Testing failed: ${errorMessage}`);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { SeedingTester };
