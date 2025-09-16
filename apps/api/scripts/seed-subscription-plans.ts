#!/usr/bin/env ts-node

/**
 * Subscription Plans Seeding Script
 *
 * This script will:
 * 1. Create Stripe products for each subscription plan
 * 2. Create Stripe prices for each billing cycle
 * 3. Insert subscription plans into the database
 * 4. Link plans with Stripe product and price IDs
 *
 * Usage:
 * cd apps/api && npx ts-node scripts/seed-subscription-plans.ts
 */

import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { StripeService } from '../src/modules/payments/services/stripe.service';
import { SubscriptionPlan } from '../src/modules/subscriptions/entities/subscription-plan.entity';
import { SubscriptionBillingCycle, SubscriptionPlanType } from '@app/shared';

// Database configuration
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'saas_user',
  password: process.env.DB_PASSWORD || 'saas_password',
  database: process.env.DB_DATABASE || 'saas_boilerplate',
  entities: [SubscriptionPlan],
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
    planType: SubscriptionPlanType.STARTER,
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
      'Collaboration': ['Single user access', 'Basic sharing'],
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
    planType: SubscriptionPlanType.PROFESSIONAL,
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
      'Collaboration': [
        'Up to 5 team members',
        'Advanced sharing & permissions',
        'Team workspaces',
      ],
      'Analytics': ['Basic analytics', 'Usage reports'],
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
    planType: SubscriptionPlanType.BUSINESS,
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
      'Collaboration': [
        'Up to 25 team members',
        'Advanced permissions',
        'Department workspaces',
        'SSO integration',
      ],
      'Analytics': [
        'Advanced analytics',
        'Custom reports',
        'Data export',
      ],
      'Integrations': ['API access', 'Webhook support'],
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
      'Collaboration': [
        'Up to 100 team members',
        'Advanced security',
        'Custom workspaces',
        'SSO & LDAP integration',
      ],
      'Analytics': [
        'Enterprise analytics',
        'Custom dashboards',
        'Advanced reporting',
        'Data warehouse integration',
      ],
      'Integrations': [
        'Full API access',
        'Custom integrations',
        'Webhook management',
        'Third-party connectors',
      ],
      'Security': [
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
    cycle: SubscriptionBillingCycle.YEARLY,
    stripeInterval: 'year' as const,
    intervalCount: 1,
  },
];

class SubscriptionPlansSeeder {
  private stripeService: StripeService;
  private subscriptionPlanRepository: any;

  constructor() {
    this.stripeService = new StripeService();
  }

  async initialize() {
    try {
      logHeader('🔌 INITIALIZING DATABASE CONNECTION');
      await dataSource.initialize();
      this.subscriptionPlanRepository = dataSource.getRepository(SubscriptionPlan);
      logSuccess('Database connection established');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError(`Failed to initialize database: ${errorMessage}`);
      throw error;
    }
  }

  async seed() {
    logHeader('🌱 STARTING SUBSCRIPTION PLANS SEEDING PROCESS');

    try {
      // Step 1: Clear existing plans (optional - comment out if you want to keep existing)
      await this.clearExistingPlans();

      // Step 2: Create subscription plans with Stripe integration
      await this.createSubscriptionPlans();

      logHeader('🎉 SUBSCRIPTION PLANS SEEDING COMPLETED SUCCESSFULLY!');
      await this.printSummary();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError(`Seeding failed: ${errorMessage}`);
      throw error;
    }
  }

  private async clearExistingPlans() {
    logStep('Clearing existing subscription plans');
    try {
      const count = await this.subscriptionPlanRepository.count();
      if (count > 0) {
        await this.subscriptionPlanRepository.delete({});
        logSuccess(`Cleared ${count} existing subscription plans`);
      } else {
        logSuccess('No existing plans to clear');
      }
    } catch (error) {
      logError(`Failed to clear existing plans: ${error}`);
      throw error;
    }
  }

  private async createSubscriptionPlans() {
    logStep('Creating subscription plans with Stripe integration');

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
            createdBy: 'seed-script',
            version: '1.0',
          },
          terms: `Terms and conditions for ${planConfig.name} plan`,
          notes: `Auto-generated plan from seed script`,
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
            price: this.calculateBillingCyclePrice(planConfig.price, billingCycle.cycle),
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
              createdBy: 'seed-script',
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

  private calculateBillingCyclePrice(basePrice: number, cycle: SubscriptionBillingCycle): number {
    switch (cycle) {
      case SubscriptionBillingCycle.QUARTERLY:
        return Math.round(basePrice * 2.7 * 100) / 100; // 10% discount
      case SubscriptionBillingCycle.YEARLY:
        return Math.round(basePrice * 10 * 100) / 100; // 17% discount
      default:
        return basePrice;
    }
  }

  private async printSummary() {
    logStep('Seeding Summary');
    try {
      const totalPlans = await this.subscriptionPlanRepository.count();
      const activePlans = await this.subscriptionPlanRepository.count({
        where: { isActive: true },
      });
      const popularPlans = await this.subscriptionPlanRepository.count({
        where: { isPopular: true },
      });

      log(`📊 Total subscription plans created: ${totalPlans}`, 'green');
      log(`✅ Active plans: ${activePlans}`, 'green');
      log(`⭐ Popular plans: ${popularPlans}`, 'green');

      // List all created plans
      const plans = await this.subscriptionPlanRepository.find({
        order: { sortOrder: 'ASC' },
      });

      log('\n📋 Created Plans:', 'cyan');
      plans.forEach((plan: SubscriptionPlan) => {
        const status = plan.isActive ? '✅' : '❌';
        const popular = plan.isPopular ? '⭐' : '  ';
        log(
          `  ${status} ${popular} ${plan.name} (${plan.billingCycle}) - $${plan.price}/${plan.billingCycle.toLowerCase()}`,
          'white'
        );
      });
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
  const seeder = new SubscriptionPlansSeeder();

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
  main().catch((error) => {
    logError(`Unhandled error: ${error}`);
    process.exit(1);
  });
}

export { SubscriptionPlansSeeder };
