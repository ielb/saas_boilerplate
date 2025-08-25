import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { TenantsModule } from './tenants.module';
import { AuthModule } from '../auth/auth.module';
import { Tenant, UserTenantMembership } from './entities';
import { User } from '../users/entities/user.entity';
import { UserRole, MembershipStatus } from '@app/shared';

describe('TenantSwitching (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let userRepository: any;
  let tenantRepository: any;
  let membershipRepository: any;

  // Test data
  let testUser: User;
  let testTenant1: Tenant;
  let testTenant2: Tenant;
  let testMembership1: UserTenantMembership;
  let testMembership2: UserTenantMembership;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, Tenant, UserTenantMembership],
          synchronize: true,
          dropSchema: true,
        }),
        CacheModule.register({
          isGlobal: true,
          ttl: 300,
        }),
        AuthModule,
        TenantsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    userRepository = dataSource.getRepository(User);
    tenantRepository = dataSource.getRepository(Tenant);
    membershipRepository = dataSource.getRepository(UserTenantMembership);

    await app.init();
  });

  beforeEach(async () => {
    // Clean up database
    await membershipRepository.delete({});
    await userRepository.delete({});
    await tenantRepository.delete({});

    // Create test tenants
    testTenant1 = tenantRepository.create({
      name: 'Test Tenant 1',
      domain: 'tenant1.test.com',
      plan: 'pro',
      features: ['feature1', 'feature2'],
      settings: { theme: 'light' },
      isActive: true,
      isVerified: true,
    });
    await tenantRepository.save(testTenant1);

    testTenant2 = tenantRepository.create({
      name: 'Test Tenant 2',
      domain: 'tenant2.test.com',
      plan: 'enterprise',
      features: ['feature1', 'feature2', 'feature3'],
      settings: { theme: 'dark' },
      isActive: true,
      isVerified: true,
    });
    await tenantRepository.save(testTenant2);

    // Create test user
    testUser = userRepository.create({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      tenantId: testTenant1.id,
      role: UserRole.MEMBER,
      emailVerified: true,
      status: 'active',
    });
    await userRepository.save(testUser);

    // Create memberships
    testMembership1 = membershipRepository.create({
      userId: testUser.id,
      tenantId: testTenant1.id,
      role: UserRole.MEMBER,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    });
    await membershipRepository.save(testMembership1);

    testMembership2 = membershipRepository.create({
      userId: testUser.id,
      tenantId: testTenant2.id,
      role: UserRole.ADMIN,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    });
    await membershipRepository.save(testMembership2);

    // Generate auth token
    authToken = await jwtService.signAsync({
      sub: testUser.id,
      email: testUser.email,
      tenantId: testUser.tenantId,
      role: testUser.role,
    });
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('/tenants/user/memberships (GET)', () => {
    it('should return user tenant memberships', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants/user/memberships')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.memberships).toHaveLength(2);
      expect(response.body.currentTenantId).toBe(testTenant1.id);
      expect(response.body.totalCount).toBe(2);
      expect(response.body.activeCount).toBe(2);
      expect(response.body.pendingCount).toBe(0);

      // Check membership details
      const membership1 = response.body.memberships.find(
        (m: any) => m.tenant.id === testTenant1.id
      );
      expect(membership1.role).toBe(UserRole.MEMBER);
      expect(membership1.isCurrentTenant).toBe(true);

      const membership2 = response.body.memberships.find(
        (m: any) => m.tenant.id === testTenant2.id
      );
      expect(membership2.role).toBe(UserRole.ADMIN);
      expect(membership2.isCurrentTenant).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/tenants/user/memberships')
        .expect(401);
    });
  });

  describe('/tenants/switch (POST)', () => {
    it('should successfully switch tenant', async () => {
      const switchDto = {
        tenantId: testTenant2.id,
        reason: 'Testing tenant switch',
      };

      const response = await request(app.getHttpServer())
        .post('/tenants/switch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(switchDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Test Tenant 2');
      expect(response.body.tenantContext.id).toBe(testTenant2.id);
      expect(response.body.membership.role).toBe(UserRole.ADMIN);
      expect(response.body.accessToken).toBeDefined();

      // Verify user's current tenant was updated
      const updatedUser = await userRepository.findOne({
        where: { id: testUser.id },
      });
      expect(updatedUser.tenantId).toBe(testTenant2.id);
    });

    it('should return 403 for unauthorized tenant', async () => {
      const unauthorizedTenant = tenantRepository.create({
        name: 'Unauthorized Tenant',
        domain: 'unauthorized.test.com',
        plan: 'basic',
        isActive: true,
      });
      await tenantRepository.save(unauthorizedTenant);

      const switchDto = {
        tenantId: unauthorizedTenant.id,
      };

      await request(app.getHttpServer())
        .post('/tenants/switch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(switchDto)
        .expect(403);
    });

    it('should return 403 for inactive membership', async () => {
      // Make membership inactive
      await membershipRepository.update(testMembership2.id, {
        status: MembershipStatus.SUSPENDED,
      });

      const switchDto = {
        tenantId: testTenant2.id,
      };

      await request(app.getHttpServer())
        .post('/tenants/switch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(switchDto)
        .expect(403);
    });

    it('should return 400 for invalid request data', async () => {
      const switchDto = {
        tenantId: 'invalid-uuid',
      };

      await request(app.getHttpServer())
        .post('/tenants/switch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(switchDto)
        .expect(400);
    });
  });

  describe('/tenants/current (GET)', () => {
    it('should return current tenant context', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tenantContext.id).toBe(testTenant1.id);
      expect(response.body.tenantContext.name).toBe('Test Tenant 1');
      expect(response.body.membership.role).toBe(UserRole.MEMBER);
    });
  });

  describe('/tenants/:tenantId/verify-access (POST)', () => {
    it('should verify access to tenant', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tenants/${testTenant1.id}/verify-access`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          permissions: ['users:read'],
        })
        .expect(200);

      expect(response.body.hasAccess).toBe(true);
      expect(response.body.role).toBe(UserRole.MEMBER);
      expect(response.body.status).toBe(MembershipStatus.ACTIVE);
      expect(response.body.tenant.id).toBe(testTenant1.id);
    });

    it('should deny access to unauthorized tenant', async () => {
      const unauthorizedTenant = tenantRepository.create({
        name: 'Unauthorized Tenant',
        domain: 'unauthorized.test.com',
        plan: 'basic',
        isActive: true,
      });
      await tenantRepository.save(unauthorizedTenant);

      const response = await request(app.getHttpServer())
        .post(`/tenants/${unauthorizedTenant.id}/verify-access`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.hasAccess).toBe(false);
      expect(response.body.reason).toBe('User is not a member of this tenant');
    });
  });

  describe('/tenants/verify-access/bulk (POST)', () => {
    it('should verify access to multiple tenants', async () => {
      const unauthorizedTenant = tenantRepository.create({
        name: 'Unauthorized Tenant',
        domain: 'unauthorized.test.com',
        plan: 'basic',
        isActive: true,
      });
      await tenantRepository.save(unauthorizedTenant);

      const bulkDto = {
        tenantIds: [testTenant1.id, testTenant2.id, unauthorizedTenant.id],
        permissions: ['users:read'],
      };

      const response = await request(app.getHttpServer())
        .post('/tenants/verify-access/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkDto)
        .expect(200);

      expect(response.body.results[testTenant1.id].hasAccess).toBe(true);
      expect(response.body.results[testTenant2.id].hasAccess).toBe(true);
      expect(response.body.results[unauthorizedTenant.id].hasAccess).toBe(
        false
      );
      expect(response.body.summary.totalChecked).toBe(3);
      expect(response.body.summary.accessGranted).toBe(2);
      expect(response.body.summary.accessDenied).toBe(1);
    });
  });

  describe('/tenants/cache/clear (POST)', () => {
    it('should clear user cache', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenants/cache/clear')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cache cleared successfully');
    });
  });

  describe('/tenants/health (GET)', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('tenant-switching');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Admin endpoints', () => {
    let adminToken: string;

    beforeEach(async () => {
      // Create admin user
      const adminUser = userRepository.create({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        tenantId: testTenant1.id,
        role: UserRole.ADMIN,
        emailVerified: true,
        status: 'active',
      });
      await userRepository.save(adminUser);

      // Create admin membership
      const adminMembership = membershipRepository.create({
        userId: adminUser.id,
        tenantId: testTenant1.id,
        role: UserRole.ADMIN,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
      });
      await membershipRepository.save(adminMembership);

      adminToken = await jwtService.signAsync({
        sub: adminUser.id,
        email: adminUser.email,
        tenantId: adminUser.tenantId,
        role: adminUser.role,
      });
    });

    describe('/tenants/admin/memberships (POST)', () => {
      it('should add user to tenant (admin only)', async () => {
        const newUser = userRepository.create({
          email: 'newuser@example.com',
          firstName: 'New',
          lastName: 'User',
          tenantId: testTenant1.id,
          role: UserRole.VIEWER,
          emailVerified: true,
          status: 'active',
        });
        await userRepository.save(newUser);

        const body = {
          userId: newUser.id,
          tenantId: testTenant2.id,
          role: UserRole.MEMBER,
        };

        const response = await request(app.getHttpServer())
          .post('/tenants/admin/memberships')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(body)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.membership.userId).toBe(newUser.id);
        expect(response.body.membership.tenantId).toBe(testTenant2.id);
        expect(response.body.membership.role).toBe(UserRole.MEMBER);

        // Verify membership was created
        const membership = await membershipRepository.findOne({
          where: { userId: newUser.id, tenantId: testTenant2.id },
        });
        expect(membership).toBeDefined();
      });
    });

    describe('/tenants/admin/memberships/:userId/:tenantId/remove (POST)', () => {
      it('should remove user from tenant (admin only)', async () => {
        const response = await request(app.getHttpServer())
          .post(
            `/tenants/admin/memberships/${testUser.id}/${testTenant2.id}/remove`
          )
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain(
          'removed from tenant successfully'
        );

        // Verify membership was soft deleted
        const membership = await membershipRepository.findOne({
          where: { userId: testUser.id, tenantId: testTenant2.id },
          withDeleted: false,
        });
        expect(membership).toBeNull();
      });
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close database connection to simulate error
      await dataSource.destroy();

      await request(app.getHttpServer())
        .get('/tenants/user/memberships')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });
  });
});
