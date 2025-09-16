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

import { User } from '../src/modules/users/entities/user.entity';
import { Tenant } from '../src/modules/tenants/entities/tenant.entity';
import { UserTenantMembership } from '../src/modules/tenants/entities/user-tenant-membership.entity';
import { SubscriptionPlan } from '../src/modules/subscriptions/entities/subscription-plan.entity';
import { Subscription } from '../src/modules/subscriptions/entities/subscription.entity';
import {
  UsageAnalytics,
  AnalyticsAggregate,
  AnalyticsAlert,
  AnalyticsReport,
  AnalyticsEventType,
  AnalyticsMetricType,
} from '../src/modules/analytics/entities/usage-analytics.entity';
import {
  UserStatus,
  AuthProvider,
  MembershipStatus,
  UserRole,
  SubscriptionBillingCycle,
  SubscriptionPlanType,
} from '@app/shared';
import {
  Permission,
  PermissionAction,
  PermissionResource,
  PermissionScope,
} from '../src/modules/rbac/entities/permission.entity';
import {
  Role,
  RoleLevel,
  RoleType,
} from '../src/modules/rbac/entities/role.entity';
import { StripeService } from '../src/modules/payments/services/stripe.service';

// Database configuration
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'saas_user',
  password: process.env.DB_PASSWORD || 'saas_password',
  database: process.env.DB_DATABASE || 'saas_boilerplate',
  entities: [
    Permission,
    Role,
    User,
    Tenant,
    UserTenantMembership,
    SubscriptionPlan,
    Subscription,
    UsageAnalytics,
    AnalyticsAggregate,
    AnalyticsAlert,
    AnalyticsReport,
  ],
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

// Analytics Configuration
const EVENT_TYPES = [
  AnalyticsEventType.USER_LOGIN,
  AnalyticsEventType.USER_LOGOUT,
  AnalyticsEventType.FEATURE_ACCESS,
  AnalyticsEventType.API_CALL,
  AnalyticsEventType.FILE_UPLOAD,
  AnalyticsEventType.FILE_DOWNLOAD,
  AnalyticsEventType.TEAM_CREATED,
  AnalyticsEventType.TEAM_JOINED,
  AnalyticsEventType.DELEGATION_CREATED,
  AnalyticsEventType.DELEGATION_ACTIVATED,
  AnalyticsEventType.INVITATION_SENT,
  AnalyticsEventType.INVITATION_ACCEPTED,
  AnalyticsEventType.BULK_IMPORT,
  AnalyticsEventType.BULK_EXPORT,
  AnalyticsEventType.PAYMENT_PROCESSED,
  AnalyticsEventType.SUBSCRIPTION_CHANGED,
  AnalyticsEventType.CUSTOM_EVENT,
];

const EVENT_NAMES = {
  [AnalyticsEventType.USER_LOGIN]: 'User Login',
  [AnalyticsEventType.USER_LOGOUT]: 'User Logout',
  [AnalyticsEventType.FEATURE_ACCESS]: 'Feature Access',
  [AnalyticsEventType.API_CALL]: 'API Call',
  [AnalyticsEventType.FILE_UPLOAD]: 'File Upload',
  [AnalyticsEventType.FILE_DOWNLOAD]: 'File Download',
  [AnalyticsEventType.TEAM_CREATED]: 'Team Created',
  [AnalyticsEventType.TEAM_JOINED]: 'Team Joined',
  [AnalyticsEventType.DELEGATION_CREATED]: 'Delegation Created',
  [AnalyticsEventType.DELEGATION_ACTIVATED]: 'Delegation Activated',
  [AnalyticsEventType.INVITATION_SENT]: 'Invitation Sent',
  [AnalyticsEventType.INVITATION_ACCEPTED]: 'Invitation Accepted',
  [AnalyticsEventType.BULK_IMPORT]: 'Bulk Import',
  [AnalyticsEventType.BULK_EXPORT]: 'Bulk Export',
  [AnalyticsEventType.PAYMENT_PROCESSED]: 'Payment Processed',
  [AnalyticsEventType.SUBSCRIPTION_CHANGED]: 'Subscription Changed',
  [AnalyticsEventType.CUSTOM_EVENT]: 'Custom Event',
};

// Subscription Plans Configuration
const subscriptionPlans = [
  {
    name: 'Starter',
    description: 'Perfect for individuals and small teams getting started',
    planType: SubscriptionPlanType.BASIC,
    price: 9.99,
    currency: 'USD',
    maxUsers: 1,
    maxProjects: 3,
    maxStorageGB: 5,
    maxApiCalls: 1000,
    isPopular: false,
    sortOrder: 1,
    features: {
      'Core Features': [
        'Basic project management',
        'Up to 3 projects',
        '5GB storage',
        '1,000 API calls/month',
        'Email support',
      ],
      Collaboration: ['Single user access', 'Basic sharing'],
    },
    limits: {
      users: 1,
      projects: 3,
      storage: 5,
      apiCalls: 1000,
    },
    restrictions: {
      advancedAnalytics: false,
      customIntegrations: false,
      prioritySupport: false,
    },
  },
  {
    name: 'Professional',
    description: 'Ideal for growing teams and businesses',
    planType: SubscriptionPlanType.STANDARD,
    price: 29.99,
    currency: 'USD',
    maxUsers: 5,
    maxProjects: 15,
    maxStorageGB: 50,
    maxApiCalls: 10000,
    isPopular: true,
    sortOrder: 2,
    features: {
      'Core Features': [
        'Advanced project management',
        'Up to 15 projects',
        '50GB storage',
        '10,000 API calls/month',
        'Priority email support',
      ],
      Collaboration: [
        'Up to 5 team members',
        'Advanced sharing & permissions',
        'Team workspaces',
      ],
      Analytics: ['Basic analytics', 'Usage reports'],
    },
    limits: {
      users: 5,
      projects: 15,
      storage: 50,
      apiCalls: 10000,
    },
    restrictions: {
      advancedAnalytics: true,
      customIntegrations: false,
      prioritySupport: true,
    },
  },
  {
    name: 'Business',
    description: 'Comprehensive solution for established businesses',
    planType: SubscriptionPlanType.PREMIUM,
    price: 79.99,
    currency: 'USD',
    maxUsers: 25,
    maxProjects: 50,
    maxStorageGB: 200,
    maxApiCalls: 50000,
    isPopular: false,
    sortOrder: 3,
    features: {
      'Core Features': [
        'Enterprise project management',
        'Up to 50 projects',
        '200GB storage',
        '50,000 API calls/month',
        'Phone & email support',
      ],
      Collaboration: [
        'Up to 25 team members',
        'Advanced permissions',
        'Department workspaces',
        'SSO integration',
      ],
      Analytics: ['Advanced analytics', 'Custom reports', 'Data export'],
      Integrations: ['API access', 'Webhook support'],
    },
    limits: {
      users: 25,
      projects: 50,
      storage: 200,
      apiCalls: 50000,
    },
    restrictions: {
      advancedAnalytics: true,
      customIntegrations: true,
      prioritySupport: true,
    },
  },
  {
    name: 'Enterprise',
    description: 'Full-featured solution for large organizations',
    planType: SubscriptionPlanType.ENTERPRISE,
    price: 199.99,
    currency: 'USD',
    maxUsers: 100,
    maxProjects: 200,
    maxStorageGB: 1000,
    maxApiCalls: 200000,
    isPopular: false,
    sortOrder: 4,
    features: {
      'Core Features': [
        'Unlimited project management',
        'Up to 200 projects',
        '1TB storage',
        '200,000 API calls/month',
        'Dedicated account manager',
        '24/7 phone support',
      ],
      Collaboration: [
        'Up to 100 team members',
        'Advanced security',
        'Custom workspaces',
        'SSO & LDAP integration',
      ],
      Analytics: [
        'Enterprise analytics',
        'Custom dashboards',
        'Advanced reporting',
        'Data warehouse integration',
      ],
      Integrations: [
        'Full API access',
        'Custom integrations',
        'Webhook management',
        'Third-party connectors',
      ],
      Security: [
        'Advanced security features',
        'Audit logs',
        'Compliance tools',
        'Data encryption',
      ],
    },
    limits: {
      users: 100,
      projects: 200,
      storage: 1000,
      apiCalls: 200000,
    },
    restrictions: {
      advancedAnalytics: true,
      customIntegrations: true,
      prioritySupport: true,
    },
  },
];

// Billing cycles configuration
const billingCycles = [
  {
    cycle: SubscriptionBillingCycle.MONTHLY,
    stripeInterval: 'month' as const,
    intervalCount: 1,
  },
  {
    cycle: SubscriptionBillingCycle.QUARTERLY,
    stripeInterval: 'month' as const,
    intervalCount: 3,
  },
  {
    cycle: SubscriptionBillingCycle.ANNUALLY,
    stripeInterval: 'year' as const,
    intervalCount: 1,
  },
];

class DatabaseSeeder {
  private permissionRepository: any;
  private roleRepository: any;
  private userRepository: any;
  private tenantRepository: any;
  private membershipRepository: any;
  private subscriptionPlanRepository: any;
  private analyticsRepository: any;
  private aggregateRepository: any;
  private alertRepository: any;
  private reportRepository: any;
  private stripeService!: StripeService;

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
      this.subscriptionPlanRepository =
        dataSource.getRepository(SubscriptionPlan);
      this.analyticsRepository = dataSource.getRepository(UsageAnalytics);
      this.aggregateRepository = dataSource.getRepository(AnalyticsAggregate);
      this.alertRepository = dataSource.getRepository(AnalyticsAlert);
      this.reportRepository = dataSource.getRepository(AnalyticsReport);
      this.stripeService = new StripeService();

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

      // Step 6.5: Verify and fix user-role relationships
      await this.verifyUserRoleRelationships();

      // Step 7: Create subscription plans with Stripe integration
      await this.createSubscriptionPlans();

      // Step 8: Create analytics data
      await this.createAnalyticsData();

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

        // Get the actual Role entity from database
        const roleName = this.getRoleNameFromUserRole(userData.role);
        const role = await this.roleRepository.findOne({
          where: { name: roleName },
        });

        if (!role) {
          logError(`Role not found: ${roleName} for user: ${userData.email}`);
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
          roleId: role.id, // Link to the actual Role entity
          status: UserStatus.ACTIVE,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          authProvider: AuthProvider.LOCAL,
        });

        await this.userRepository.save(user);
        createdCount++;
        logSuccess(`Created user: ${userData.email} with role: ${roleName}`);
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
        relations: ['roles'], // Include roles relation
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
        // Get the role for this user
        const roleName = this.getRoleNameFromUserRole(userData.role);
        const role = await this.roleRepository.findOne({
          where: { name: roleName },
        });

        if (!role) {
          logError(
            `Role not found: ${roleName} for membership: ${userData.email}`
          );
          continue;
        }

        const membership = this.membershipRepository.create({
          userId: user.id,
          tenantId: tenant.id,
          roleId: role.id, // Link to the actual Role entity
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
        });

        await this.membershipRepository.save(membership);
        createdCount++;
        logSuccess(
          `Created membership for: ${userData.email} with role: ${roleName}`
        );
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

  private async verifyUserRoleRelationships() {
    logStep('Verifying User-Role Relationships');

    const users = await this.userRepository.find({
      relations: ['roles'],
    });

    let fixedCount = 0;
    let verifiedCount = 0;

    for (const user of users) {
      const expectedRoleName = this.getRoleNameFromUserRole(user.role);
      const expectedRole = await this.roleRepository.findOne({
        where: { name: expectedRoleName },
      });

      if (!expectedRole) {
        logError(
          `Expected role not found: ${expectedRoleName} for user: ${user.email}`
        );
        continue;
      }

      // Check if user has the correct roleId
      if (!user.roleId || user.roleId !== expectedRole.id) {
        // Fix the user's roleId
        user.roleId = expectedRole.id;
        await this.userRepository.save(user);
        fixedCount++;
        logSuccess(`Fixed role for user: ${user.email} -> ${expectedRoleName}`);
      } else {
        verifiedCount++;
        log(
          `✓ User ${user.email} has correct role: ${expectedRoleName}`,
          'green'
        );
      }

      // Also check and fix membership roleId
      const membership = await this.membershipRepository.findOne({
        where: { userId: user.id },
      });

      if (
        membership &&
        (!membership.roleId || membership.roleId !== expectedRole.id)
      ) {
        membership.roleId = expectedRole.id;
        await this.membershipRepository.save(membership);
        logSuccess(
          `Fixed membership role for user: ${user.email} -> ${expectedRoleName}`
        );
      }
    }

    logSuccess(
      `User-role verification completed: ${verifiedCount} verified, ${fixedCount} fixed`
    );
  }

  private getRoleNameFromUserRole(userRole: UserRole | string): string {
    if (typeof userRole === 'string') {
      // Handle string roles directly
      switch (userRole) {
        case 'Super Admin':
          return 'Super Admin';
        case 'Owner':
          return 'Super Admin';
        case 'Admin':
          return 'Admin';
        case 'Manager':
          return 'Manager';
        case 'Member':
          return 'Member';
        case 'Viewer':
          return 'Viewer';
        default:
          return 'Member';
      }
    }

    // Handle UserRole enum
    switch (userRole) {
      case UserRole.OWNER:
        return 'Super Admin'; // Map OWNER to Super Admin role
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

  private async createSubscriptionPlans() {
    logStep('Creating Subscription Plans');

    // Check if Stripe is available
    const isStripeAvailable =
      this.stripeService &&
      this.stripeService.getStripeInstance() &&
      process.env.STRIPE_SECRET_KEY &&
      !process.env.STRIPE_SECRET_KEY.includes('your_stripe_secret_key_here');

    if (!isStripeAvailable) {
      logWarning(
        'Stripe integration not available - creating plans without Stripe integration'
      );
    }

    for (const planConfig of subscriptionPlans) {
      try {
        log(`\n📦 Creating plan: ${planConfig.name}`, 'blue');

        let stripeProduct = null;
        let prices: { [key: string]: string } = {};

        if (isStripeAvailable) {
          try {
            // Create Stripe product
            stripeProduct = await this.stripeService.createProduct({
              name: planConfig.name,
              description: planConfig.description,
              metadata: {
                planType: planConfig.planType,
                maxUsers: planConfig.maxUsers.toString(),
                maxProjects: planConfig.maxProjects.toString(),
                maxStorageGB: planConfig.maxStorageGB.toString(),
                maxApiCalls: planConfig.maxApiCalls.toString(),
              },
            });

            logSuccess(`Created Stripe product: ${stripeProduct.id}`);

            // Create prices for each billing cycle
            for (const billingCycle of billingCycles) {
              const price = await this.stripeService.createPrice({
                productId: stripeProduct.id,
                unitAmount: Math.round(planConfig.price * 100), // Convert to cents
                currency: planConfig.currency.toLowerCase(),
                recurring: {
                  interval: billingCycle.stripeInterval,
                  intervalCount: billingCycle.intervalCount,
                },
                metadata: {
                  planType: planConfig.planType,
                  billingCycle: billingCycle.cycle,
                },
                nickname: `${planConfig.name} - ${billingCycle.cycle}`,
              });

              prices[billingCycle.cycle] = price.id;
              logSuccess(
                `Created price for ${billingCycle.cycle}: ${price.id}`
              );
            }
          } catch (stripeError: any) {
            logWarning(
              `Stripe integration failed: ${stripeError.message || stripeError}`
            );
            logWarning('Continuing without Stripe integration...');
            stripeProduct = null;
            prices = {};
          }
        }

        // Create subscription plan entity
        const subscriptionPlan = this.subscriptionPlanRepository.create({
          id: uuidv4(),
          name: planConfig.name,
          description: planConfig.description,
          planType: planConfig.planType,
          billingCycle: SubscriptionBillingCycle.MONTHLY, // Default billing cycle
          price: planConfig.price,
          currency: planConfig.currency,
          maxUsers: planConfig.maxUsers,
          maxProjects: planConfig.maxProjects,
          maxStorageGB: planConfig.maxStorageGB,
          maxApiCalls: planConfig.maxApiCalls,
          features: planConfig.features,
          limits: planConfig.limits,
          restrictions: planConfig.restrictions,
          isActive: true,
          isPopular: planConfig.isPopular,
          isCustom: false,
          sortOrder: planConfig.sortOrder,
          stripeProductId: stripeProduct?.id || null,
          stripePriceId: prices[SubscriptionBillingCycle.MONTHLY] || null,
          metadata: {
            ...(Object.keys(prices).length > 0 && { stripePrices: prices }),
            createdBy: 'seed-database-script',
            version: '1.0',
            stripeIntegration: isStripeAvailable,
          },
          terms: `Terms and conditions for ${planConfig.name} plan`,
          notes: `Auto-generated plan from seed database script${!isStripeAvailable ? ' (without Stripe integration)' : ''}`,
        });

        await this.subscriptionPlanRepository.save(subscriptionPlan);
        logSuccess(`Saved subscription plan: ${subscriptionPlan.id}`);

        // Create additional plan variants for different billing cycles
        for (const billingCycle of billingCycles.slice(1)) {
          const variantPlan = this.subscriptionPlanRepository.create({
            id: uuidv4(),
            name: `${planConfig.name} (${billingCycle.cycle})`,
            description: `${planConfig.description} - Billed ${billingCycle.cycle.toLowerCase()}`,
            planType: planConfig.planType,
            billingCycle: billingCycle.cycle,
            price: this.calculateBillingCyclePrice(
              planConfig.price,
              billingCycle.cycle
            ),
            currency: planConfig.currency,
            maxUsers: planConfig.maxUsers,
            maxProjects: planConfig.maxProjects,
            maxStorageGB: planConfig.maxStorageGB,
            maxApiCalls: planConfig.maxApiCalls,
            features: planConfig.features,
            limits: planConfig.limits,
            restrictions: planConfig.restrictions,
            isActive: true,
            isPopular: false, // Only monthly plans are marked as popular
            isCustom: false,
            sortOrder: planConfig.sortOrder + 100, // Offset for variants
            stripeProductId: stripeProduct?.id || null,
            stripePriceId: prices[billingCycle.cycle] || null,
            metadata: {
              parentPlanId: subscriptionPlan.id,
              billingCycle: billingCycle.cycle,
              createdBy: 'seed-database-script',
              version: '1.0',
              stripeIntegration: isStripeAvailable,
            },
            terms: `Terms and conditions for ${planConfig.name} plan (${billingCycle.cycle})`,
            notes: `Billing cycle variant of ${planConfig.name}${!isStripeAvailable ? ' (without Stripe integration)' : ''}`,
          });

          await this.subscriptionPlanRepository.save(variantPlan);
          logSuccess(`Saved plan variant: ${variantPlan.name}`);
        }
      } catch (error) {
        logError(`Failed to create plan ${planConfig.name}: ${error}`);
        throw error;
      }
    }
  }

  private calculateBillingCyclePrice(
    basePrice: number,
    cycle: SubscriptionBillingCycle
  ): number {
    switch (cycle) {
      case SubscriptionBillingCycle.QUARTERLY:
        return Math.round(basePrice * 2.7 * 100) / 100; // 10% discount
      case SubscriptionBillingCycle.ANNUALLY:
        return Math.round(basePrice * 10 * 100) / 100; // 17% discount
      default:
        return basePrice;
    }
  }

  private async createAnalyticsData() {
    logStep('Creating Analytics Data');

    try {
      // Get existing tenants and users
      const tenants = await this.tenantRepository.find();
      const users = await this.userRepository.find();

      if (tenants.length === 0) {
        logWarning('No tenants found. Skipping analytics seeding.');
        return;
      }

      if (users.length === 0) {
        logWarning('No users found. Skipping analytics seeding.');
        return;
      }

      logSuccess(`Found ${tenants.length} tenants and ${users.length} users`);

      // Seed analytics data for each tenant
      for (const tenant of tenants) {
        await this.seedTenantAnalytics(tenant, users);
      }

      logSuccess('Analytics data creation completed successfully!');
    } catch (error) {
      logError(`Failed to create analytics data: ${error}`);
      throw error;
    }
  }

  private async seedTenantAnalytics(tenant: any, users: any[]) {
    logStep(`Seeding analytics data for tenant: ${tenant.name}`);

    // Filter users for this tenant (simplified - in real app you'd check memberships)
    const tenantUsers = users.filter(
      user =>
        user.email.includes('admin') ||
        user.email.includes('manager') ||
        user.email.includes('member') ||
        user.email.includes('viewer')
    );

    // Generate events for the last 30 days
    await this.generateAnalyticsEvents(tenant, tenantUsers);

    // Generate aggregates
    await this.generateAnalyticsAggregates(tenant);

    // Generate alerts
    await this.generateAnalyticsAlerts(tenant);

    // Generate reports
    await this.generateAnalyticsReports(tenant);

    logSuccess(`Completed analytics seeding for tenant: ${tenant.name}`);
  }

  private async generateAnalyticsEvents(tenant: any, users: any[]) {
    logStep(`Generating analytics events for ${tenant.name}`);

    const events = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Generate events for each day in the last 30 days
    for (let day = 0; day < 30; day++) {
      const currentDate = new Date(
        thirtyDaysAgo.getTime() + day * 24 * 60 * 60 * 1000
      );

      // Generate 10-50 events per day
      const eventsPerDay = Math.floor(Math.random() * 41) + 10;

      for (let i = 0; i < eventsPerDay; i++) {
        const eventType =
          EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        const timestamp = new Date(
          currentDate.getTime() + Math.random() * 24 * 60 * 60 * 1000
        );
        const eventName =
          EVENT_NAMES[eventType as keyof typeof EVENT_NAMES] || 'Custom Event';

        const event = this.analyticsRepository.create({
          id: uuidv4(),
          tenantId: tenant.id,
          userId: user?.id || null,
          eventType,
          eventName,
          description: `Test event: ${eventName}`,
          metricType: AnalyticsMetricType.COUNT,
          metricValue: Math.floor(Math.random() * 100) + 1,
          metadata: {
            source: 'seeding-script',
            test: true,
            day: day,
            eventIndex: i,
          },
          resourceId: `resource-${Math.floor(Math.random() * 1000)}`,
          resourceType: 'test-resource',
          sessionId: `session-${Math.floor(Math.random() * 10000)}`,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Test Browser) Analytics Seeder/1.0',
          timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        events.push(event);
      }
    }

    // Save events in batches
    const batchSize = 100;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      await this.analyticsRepository.save(batch);
    }

    logSuccess(
      `Generated ${events.length} analytics events for ${tenant.name}`
    );
  }

  private async generateAnalyticsAggregates(tenant: any) {
    logStep(`Generating analytics aggregates for ${tenant.name}`);

    const aggregates = [];
    const now = new Date();
    const periods = ['hour', 'day', 'week', 'month'];

    // Generate aggregates for different periods
    for (const period of periods) {
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

        const aggregate = this.aggregateRepository.create({
          id: uuidv4(),
          tenantId: tenant.id,
          metricName: `test_metric_${period}`,
          period,
          totalValue: Math.floor(Math.random() * 10000) + 1000,
          averageValue: Math.floor(Math.random() * 100) + 10,
          count: Math.floor(Math.random() * 1000) + 100,
          minValue: Math.floor(Math.random() * 10) + 1,
          maxValue: Math.floor(Math.random() * 500) + 100,
          breakdown: {
            eventTypes: {
              user_login: Math.floor(Math.random() * 100) + 10,
              user_logout: Math.floor(Math.random() * 100) + 10,
              api_call: Math.floor(Math.random() * 100) + 10,
            },
            users: Math.floor(Math.random() * 50) + 5,
          },
          timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        aggregates.push(aggregate);
      }
    }

    await this.aggregateRepository.save(aggregates);
    logSuccess(
      `Generated ${aggregates.length} analytics aggregates for ${tenant.name}`
    );
  }

  private async generateAnalyticsAlerts(tenant: any) {
    logStep(`Generating analytics alerts for ${tenant.name}`);

    const alerts = [
      {
        alertName: 'High Login Rate',
        description: 'Alert when login rate exceeds 100 per hour',
        severity: 'high',
        metricName: 'user_login',
        condition: 'gt',
        threshold: 100,
        isActive: true,
        triggerCount: Math.floor(Math.random() * 5),
        lastTriggeredAt: Math.random() > 0.5 ? new Date() : null,
        metadata: {
          notificationEmail: 'admin@example.com',
          notificationSlack: '#alerts',
        },
      },
      {
        alertName: 'Low User Activity',
        description: 'Alert when user activity drops below 10 per hour',
        severity: 'medium',
        metricName: 'user_activity',
        condition: 'lt',
        threshold: 10,
        isActive: true,
        triggerCount: Math.floor(Math.random() * 3),
        lastTriggeredAt: Math.random() > 0.7 ? new Date() : null,
        metadata: {
          notificationEmail: 'manager@example.com',
        },
      },
      {
        alertName: 'System Error Rate',
        description: 'Alert when error rate exceeds 5%',
        severity: 'critical',
        metricName: 'error_rate',
        condition: 'gt',
        threshold: 5,
        isActive: true,
        triggerCount: Math.floor(Math.random() * 2),
        lastTriggeredAt: Math.random() > 0.8 ? new Date() : null,
        metadata: {
          notificationEmail: 'admin@example.com',
          notificationSlack: '#critical-alerts',
        },
      },
    ];

    const alertEntities = alerts.map(alert =>
      this.alertRepository.create({
        id: uuidv4(),
        tenantId: tenant.id,
        ...alert,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await this.alertRepository.save(alertEntities);
    logSuccess(
      `Generated ${alertEntities.length} analytics alerts for ${tenant.name}`
    );
  }

  private async generateAnalyticsReports(tenant: any) {
    logStep(`Generating analytics reports for ${tenant.name}`);

    const reports = [
      {
        reportType: 'daily_summary',
        reportName: 'Daily Analytics Summary',
        description: 'Daily summary of all analytics events',
        status: 'completed',
        format: 'json',
        downloadUrl: `https://api.example.com/reports/${uuidv4()}/download`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: {
          period: 'daily',
          eventCount: Math.floor(Math.random() * 1000) + 100,
          userCount: Math.floor(Math.random() * 50) + 10,
        },
        completedAt: new Date(),
      },
      {
        reportType: 'weekly_summary',
        reportName: 'Weekly Analytics Summary',
        description: 'Weekly summary of all analytics events',
        status: 'completed',
        format: 'csv',
        downloadUrl: `https://api.example.com/reports/${uuidv4()}/download`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        metadata: {
          period: 'weekly',
          eventCount: Math.floor(Math.random() * 5000) + 1000,
          userCount: Math.floor(Math.random() * 100) + 20,
        },
        completedAt: new Date(),
      },
      {
        reportType: 'monthly_summary',
        reportName: 'Monthly Analytics Summary',
        description: 'Monthly summary of all analytics events',
        status: 'processing',
        format: 'pdf',
        metadata: {
          period: 'monthly',
          eventCount: Math.floor(Math.random() * 20000) + 5000,
          userCount: Math.floor(Math.random() * 200) + 50,
        },
      },
    ];

    const reportEntities = reports.map(report =>
      this.reportRepository.create({
        id: uuidv4(),
        tenantId: tenant.id,
        ...report,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await this.reportRepository.save(reportEntities);
    logSuccess(
      `Generated ${reportEntities.length} analytics reports for ${tenant.name}`
    );
  }

  private async printSummary() {
    logHeader('📊 SEEDING SUMMARY');

    log('🔐 Test Users Created:', 'bright');
    const users = await this.userRepository.find({
      relations: ['roles'],
    });

    for (const user of users) {
      const roleName = user.role
        ? this.getRoleNameFromUserRole(user.role)
        : 'Unknown';
      log(
        `   ${user.email} (${user.firstName} ${user.lastName}) - Role: ${roleName} (ID: ${user.roleId || 'Not Set'})`,
        'green'
      );
    }

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

    // Show subscription plans created
    log('\n💳 Subscription Plans Created:', 'bright');
    const plans = await this.subscriptionPlanRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });

    for (const plan of plans) {
      log(`   ${plan.name} - $${plan.price}/${plan.billingCycle}`, 'green');
      log(
        `     Type: ${plan.planType} | Users: ${plan.maxUsers} | Projects: ${plan.maxProjects}`,
        'cyan'
      );
      if (plan.stripeProductId) {
        log(`     Stripe Product: ${plan.stripeProductId}`, 'cyan');
      }
    }

    // Show analytics data created
    log('\n📊 Analytics Data Created:', 'bright');
    const analyticsCount = await this.analyticsRepository.count();
    const aggregatesCount = await this.aggregateRepository.count();
    const alertsCount = await this.alertRepository.count();
    const reportsCount = await this.reportRepository.count();

    log(`   Analytics Events: ${analyticsCount}`, 'green');
    log(`   Analytics Aggregates: ${aggregatesCount}`, 'green');
    log(`   Analytics Alerts: ${alertsCount}`, 'green');
    log(`   Analytics Reports: ${reportsCount}`, 'green');

    log('\n🎯 Next Steps:', 'bright');
    log('   1. Test login with any of the created users', 'cyan');
    log('   2. Verify permissions and role assignments', 'cyan');
    log('   3. Test API endpoints with different user roles', 'cyan');
    log('   4. Test team functionality with admin and manager users', 'cyan');
    log('   5. Test subscription plans with Stripe integration', 'cyan');
    log('   6. Use the subscription plans in your Postman collection', 'cyan');
    log('   7. Test analytics endpoints with the generated data', 'cyan');
    log('   8. Review analytics dashboards and reports', 'cyan');

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
