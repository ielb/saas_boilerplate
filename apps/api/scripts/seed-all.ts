#!/usr/bin/env ts-node

/**
 * Master Database Seeding Script
 *
 * This script will seed the entire database with all required data:
 * 1. Permissions and roles
 * 2. Users and tenants
 * 3. Subscription plans with Stripe integration
 * 4. Analytics data (optional)
 *
 * Usage:
 * cd apps/api && npx ts-node scripts/seed-all.ts
 */

import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

// Import all entities
import { User } from '../src/modules/users/entities/user.entity';
import { Tenant } from '../src/modules/tenants/entities/tenant.entity';
import { UserTenantMembership } from '../src/modules/tenants/entities/user-tenant-membership.entity';
import { SubscriptionPlan } from '../src/modules/subscriptions/entities/subscription-plan.entity';
import { Subscription } from '../src/modules/subscriptions/entities/subscription.entity';
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

// Import services
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
  log('='.repeat(60), 'cyan');
}

function logStep(message: string) {
  log(`\n📋 ${message}`, 'yellow');
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

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

class MasterSeeder {
  private stripeService: StripeService;
  private permissionRepository: any;
  private roleRepository: any;
  private userRepository: any;
  private tenantRepository: any;
  private membershipRepository: any;
  private subscriptionPlanRepository: any;

  constructor() {
    this.stripeService = new StripeService();
  }

  async initialize() {
    try {
      logHeader('🔌 INITIALIZING DATABASE CONNECTION');
      await dataSource.initialize();

      this.permissionRepository = dataSource.getRepository(Permission);
      this.roleRepository = dataSource.getRepository(Role);
      this.userRepository = dataSource.getRepository(User);
      this.tenantRepository = dataSource.getRepository(Tenant);
      this.membershipRepository =
        dataSource.getRepository(UserTenantMembership);
      this.subscriptionPlanRepository =
        dataSource.getRepository(SubscriptionPlan);

      logSuccess('Database connection established');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError(`Failed to initialize database: ${errorMessage}`);
      throw error;
    }
  }

  async seed() {
    logHeader('🌱 STARTING COMPREHENSIVE DATABASE SEEDING');

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

      // Step 7: Create subscription plans with Stripe integration
      await this.createSubscriptionPlans();

      logHeader('🎉 COMPREHENSIVE DATABASE SEEDING COMPLETED!');
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
    const permissions: Permission[] = [];

    for (const resource of Object.values(PermissionResource)) {
      for (const action of Object.values(PermissionAction)) {
        const scope = PermissionScope.TENANT;

        const permission = this.permissionRepository.create({
          id: uuidv4(),
          name: `${action.toLowerCase()}_${resource.toLowerCase()}`,
          resource,
          action,
          scope,
          description: `${action} ${resource}`,
        });

        permissions.push(permission);
      }
    }

    await this.permissionRepository.save(permissions);
    logSuccess(`Created ${permissions.length} permissions`);
  }

  private async createRoles() {
    logStep('Creating Roles');
    const roles = [
      {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        level: RoleLevel.OWNER,
        type: RoleType.SYSTEM,
        isActive: true,
        isDefault: false,
        permissions: [], // Will be assigned all permissions
      },
      {
        name: 'Owner',
        description: 'Full tenant access with all permissions',
        level: RoleLevel.OWNER,
        type: RoleType.CUSTOM,
        isActive: true,
        isDefault: false,
        permissions: [], // Will be assigned tenant permissions
      },
      {
        name: 'Admin',
        description: 'Administrative access within tenant',
        level: RoleLevel.ADMIN,
        type: RoleType.CUSTOM,
        isActive: true,
        isDefault: false,
        permissions: [], // Will be assigned admin permissions
      },
      {
        name: 'Manager',
        description: 'Team management and project oversight',
        level: RoleLevel.MANAGER,
        type: RoleType.CUSTOM,
        isActive: true,
        isDefault: false,
        permissions: [], // Will be assigned manager permissions
      },
      {
        name: 'Member',
        description: 'Standard user with basic operations',
        level: RoleLevel.MEMBER,
        type: RoleType.CUSTOM,
        isActive: true,
        isDefault: true,
        permissions: [], // Will be assigned member permissions
      },
      {
        name: 'Viewer',
        description: 'Read-only access to resources',
        level: RoleLevel.VIEWER,
        type: RoleType.CUSTOM,
        isActive: true,
        isDefault: false,
        permissions: [], // Will be assigned viewer permissions
      },
    ];

    const createdRoles = await this.roleRepository.save(roles);
    logSuccess(`Created ${createdRoles.length} roles`);
    return createdRoles;
  }

  private async assignPermissionsToRoles() {
    logStep('Assigning Permissions to Roles');

    const roles = await this.roleRepository.find();
    const permissions = await this.permissionRepository.find();

    for (const role of roles) {
      let rolePermissions: Permission[] = [];

      switch (role.name) {
        case 'Super Admin':
          rolePermissions = permissions; // All permissions
          break;
        case 'Owner':
          rolePermissions = permissions.filter(
            (p: Permission) => p.scope === PermissionScope.TENANT
          );
          break;
        case 'Admin':
          rolePermissions = permissions.filter(
            (p: Permission) =>
              p.scope === PermissionScope.TENANT &&
              (p.action === PermissionAction.CREATE ||
                p.action === PermissionAction.READ ||
                p.action === PermissionAction.UPDATE)
          );
          break;
        case 'Manager':
          rolePermissions = permissions.filter(
            (p: Permission) =>
              p.scope === PermissionScope.TENANT &&
              (p.resource === PermissionResource.USERS ||
                p.resource === PermissionResource.TEAMS) &&
              (p.action === PermissionAction.CREATE ||
                p.action === PermissionAction.READ ||
                p.action === PermissionAction.UPDATE)
          );
          break;
        case 'Member':
          rolePermissions = permissions.filter(
            (p: Permission) =>
              p.scope === PermissionScope.TENANT &&
              p.action === PermissionAction.READ
          );
          break;
        case 'Viewer':
          rolePermissions = permissions.filter(
            (p: Permission) =>
              p.scope === PermissionScope.TENANT &&
              p.action === PermissionAction.READ
          );
          break;
      }

      role.permissions = rolePermissions;
      await this.roleRepository.save(role);
    }

    logSuccess('Permissions assigned to roles');
  }

  private async createTenants() {
    logStep('Creating Tenants');
    const tenants = [
      {
        name: 'System',
        description: 'System administration tenant',
        isActive: true,
        settings: {
          allowRegistration: false,
          requireEmailVerification: true,
          maxUsers: 1,
        },
      },
      {
        name: 'Acmac',
        description: 'Main tenant for all users',
        isActive: true,
        settings: {
          allowRegistration: true,
          requireEmailVerification: true,
          maxUsers: 1000,
        },
      },
    ];

    const createdTenants = await this.tenantRepository.save(tenants);
    logSuccess(`Created ${createdTenants.length} tenants`);
    return createdTenants;
  }

  private async createUsers() {
    logStep('Creating Users');
    const users = [
      {
        email: 'superadmin@example.com',
        password: await argon2.hash('SuperAdmin123!'),
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        authProvider: AuthProvider.LOCAL,
      },
      {
        email: 'admin@example.com',
        password: await argon2.hash('Admin123!'),
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        authProvider: AuthProvider.LOCAL,
      },
      {
        email: 'manager@example.com',
        password: await argon2.hash('Manager123!'),
        firstName: 'Manager',
        lastName: 'User',
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        authProvider: AuthProvider.LOCAL,
      },
      {
        email: 'member@example.com',
        password: await argon2.hash('Member123!'),
        firstName: 'Member',
        lastName: 'User',
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        authProvider: AuthProvider.LOCAL,
      },
      {
        email: 'viewer@example.com',
        password: await argon2.hash('Viewer123!'),
        firstName: 'Viewer',
        lastName: 'User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        authProvider: AuthProvider.LOCAL,
      },
    ];

    const createdUsers = await this.userRepository.save(users);
    logSuccess(`Created ${createdUsers.length} users`);
    return createdUsers;
  }

  private async createUserTenantMemberships() {
    logStep('Creating User-Tenant Memberships');

    const users = await this.userRepository.find();
    const tenants = await this.tenantRepository.find();
    const roles = await this.roleRepository.find();

    const systemTenant = tenants.find((t: Tenant) => t.name === 'System');
    const acmacTenant = tenants.find((t: Tenant) => t.name === 'Acmac');

    const memberships = [];

    for (const user of users) {
      let tenant, role;

      if (user.role === UserRole.OWNER) {
        tenant = systemTenant;
        role = roles.find((r: Role) => r.name === 'Super Admin');
      } else {
        tenant = acmacTenant;
        role = roles.find(
          (r: Role) => r.name === this.getRoleNameFromUserRole(user.role)
        );
      }

      if (tenant && role) {
        const membership = this.membershipRepository.create({
          userId: user.id,
          tenantId: tenant.id,
          roleId: role.id,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
        });
        memberships.push(membership);
      }
    }

    await this.membershipRepository.save(memberships);
    logSuccess(`Created ${memberships.length} user-tenant memberships`);
  }

  private getRoleNameFromUserRole(userRole: UserRole): string {
    switch (userRole) {
      case UserRole.ADMIN:
        return 'Admin';
      case UserRole.MANAGER:
        return 'Manager';
      case UserRole.MEMBER:
        return 'Member';
      case UserRole.VIEWER:
        return 'Viewer';
      default:
        return 'Member';
    }
  }

  private async createSubscriptionPlans() {
    logStep('Creating Subscription Plans with Stripe Integration');

    for (const planConfig of subscriptionPlans) {
      try {
        log(`\n📦 Creating plan: ${planConfig.name}`, 'blue');

        // Create Stripe product
        const stripeProduct = await this.stripeService.createProduct({
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
        const prices: { [key: string]: string } = {};

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
          logSuccess(`Created price for ${billingCycle.cycle}: ${price.id}`);
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
          stripeProductId: stripeProduct.id,
          stripePriceId: prices[SubscriptionBillingCycle.MONTHLY], // Default to monthly price
          metadata: {
            stripePrices: prices,
            createdBy: 'master-seed-script',
            version: '1.0',
          },
          terms: `Terms and conditions for ${planConfig.name} plan`,
          notes: `Auto-generated plan from master seed script`,
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
            stripeProductId: stripeProduct.id,
            stripePriceId: prices[billingCycle.cycle],
            metadata: {
              parentPlanId: subscriptionPlan.id,
              billingCycle: billingCycle.cycle,
              createdBy: 'master-seed-script',
              version: '1.0',
            },
            terms: `Terms and conditions for ${planConfig.name} plan (${billingCycle.cycle})`,
            notes: `Billing cycle variant of ${planConfig.name}`,
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

  private async printSummary() {
    logStep('Seeding Summary');
    try {
      const [
        permissionCount,
        roleCount,
        userCount,
        tenantCount,
        membershipCount,
        planCount,
      ] = await Promise.all([
        this.permissionRepository.count(),
        this.roleRepository.count(),
        this.userRepository.count(),
        this.tenantRepository.count(),
        this.membershipRepository.count(),
        this.subscriptionPlanRepository.count(),
      ]);

      log(`📊 Database Seeding Summary:`, 'cyan');
      log(`  🔐 Permissions: ${permissionCount}`, 'green');
      log(`  👥 Roles: ${roleCount}`, 'green');
      log(`  👤 Users: ${userCount}`, 'green');
      log(`  🏢 Tenants: ${tenantCount}`, 'green');
      log(`  🔗 Memberships: ${membershipCount}`, 'green');
      log(`  📦 Subscription Plans: ${planCount}`, 'green');

      // List test users
      const users = await this.userRepository.find();
      log('\n👤 Test Users Created:', 'cyan');
      users.forEach((user: User) => {
        log(`  📧 ${user.email} (${user.role})`, 'white');
      });

      // List subscription plans
      const plans = await this.subscriptionPlanRepository.find({
        order: { sortOrder: 'ASC' },
      });
      log('\n📦 Subscription Plans Created:', 'cyan');
      plans.forEach((plan: SubscriptionPlan) => {
        const status = plan.isActive ? '✅' : '❌';
        const popular = plan.isPopular ? '⭐' : '  ';
        log(
          `  ${status} ${popular} ${plan.name} (${plan.billingCycle}) - $${plan.price}/${plan.billingCycle.toLowerCase()}`,
          'white'
        );
      });

      log('\n🎯 Next Steps:', 'yellow');
      log('  1. Test the API endpoints with the created users', 'white');
      log(
        '  2. Use the subscription plans in your Postman collection',
        'white'
      );
      log('  3. Create subscriptions using the seeded plans', 'white');
      log('  4. Test the complete user journey', 'white');
    } catch (error) {
      logError(`Failed to generate summary: ${error}`);
    }
  }

  async close() {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      logSuccess('Database connection closed');
    }
  }
}

// Main execution
async function main() {
  const seeder = new MasterSeeder();

  try {
    await seeder.initialize();
    await seeder.seed();
  } catch (error) {
    logError(`Seeding process failed: ${error}`);
    process.exit(1);
  } finally {
    await seeder.close();
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    logError(`Unhandled error: ${error}`);
    process.exit(1);
  });
}

export { MasterSeeder };
