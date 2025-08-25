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
import { BrandingTheme, LogoType } from './dto/tenant-branding.dto';

describe('TenantBranding (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let userRepository: any;
  let tenantRepository: any;
  let membershipRepository: any;

  // Test data
  let testUser: User;
  let testAdmin: User;
  let testTenant: Tenant;
  let testMembership: UserTenantMembership;
  let adminMembership: UserTenantMembership;
  let userToken: string;
  let adminToken: string;

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

    // Create test tenant
    testTenant = tenantRepository.create({
      name: 'Test Tenant',
      domain: 'test.com',
      plan: 'pro',
      features: ['feature1', 'feature2'],
      settings: {
        branding: {
          theme: BrandingTheme.LIGHT,
          colors: {
            primary: '#3B82F6',
            secondary: '#6B7280',
          },
        },
      },
      isActive: true,
      isVerified: true,
    });
    await tenantRepository.save(testTenant);

    // Create test user (member)
    testUser = userRepository.create({
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      tenantId: testTenant.id,
      role: UserRole.MEMBER,
      emailVerified: true,
      status: 'active',
    });
    await userRepository.save(testUser);

    // Create test admin
    testAdmin = userRepository.create({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      tenantId: testTenant.id,
      role: UserRole.ADMIN,
      emailVerified: true,
      status: 'active',
    });
    await userRepository.save(testAdmin);

    // Create memberships
    testMembership = membershipRepository.create({
      userId: testUser.id,
      tenantId: testTenant.id,
      role: UserRole.MEMBER,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    });
    await membershipRepository.save(testMembership);

    adminMembership = membershipRepository.create({
      userId: testAdmin.id,
      tenantId: testTenant.id,
      role: UserRole.ADMIN,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    });
    await membershipRepository.save(adminMembership);

    // Generate auth tokens
    userToken = await jwtService.signAsync({
      sub: testUser.id,
      email: testUser.email,
      tenantId: testUser.tenantId,
      role: testUser.role,
    });

    adminToken = await jwtService.signAsync({
      sub: testAdmin.id,
      email: testAdmin.email,
      tenantId: testAdmin.tenantId,
      role: testAdmin.role,
    });
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('/tenants/branding (GET)', () => {
    it('should return tenant branding configuration', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants/branding')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.branding.theme).toBe(BrandingTheme.LIGHT);
      expect(response.body.branding.colors.primary).toBe('#3B82F6');
      expect(response.body.tenant.id).toBe(testTenant.id);
      expect(response.body.tenant.name).toBe('Test Tenant');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer()).get('/tenants/branding').expect(401);
    });

    it('should return default branding when no custom branding is set', async () => {
      // Update tenant to remove branding
      await tenantRepository.update(testTenant.id, {
        settings: {},
      });

      const response = await request(app.getHttpServer())
        .get('/tenants/branding')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.branding.theme).toBe(BrandingTheme.LIGHT);
      expect(response.body.branding.colors.primary).toBe('#3B82F6');
    });
  });

  describe('/tenants/branding (PUT)', () => {
    it('should update tenant branding successfully (admin only)', async () => {
      const brandingDto = {
        theme: BrandingTheme.DARK,
        colors: {
          primary: '#FF5733',
          secondary: '#33FF57',
          accent: '#3357FF',
          background: '#1A1A1A',
          text: '#FFFFFF',
        },
        typography: {
          primaryFont: 'Roboto, sans-serif',
          headingFont: 'Poppins, sans-serif',
          baseFontSize: '16',
          lineHeight: '1.6',
        },
        logo: {
          url: 'https://example.com/logo.png',
          type: LogoType.IMAGE,
          altText: 'Company Logo',
          width: '200',
          height: '60',
        },
        customCss: '.custom-button { border-radius: 8px; }',
        favicon: 'https://example.com/favicon.ico',
        enableCustomBranding: true,
        showTenantName: true,
        showLogo: true,
        headerText: 'Welcome to Our Platform',
        footerText: '© 2024 Our Company. All rights reserved.',
      };

      const response = await request(app.getHttpServer())
        .put('/tenants/branding')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(brandingDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated successfully');
      expect(response.body.branding.theme).toBe(BrandingTheme.DARK);
      expect(response.body.branding.colors.primary).toBe('#FF5733');

      // Verify the branding was actually updated in the database
      const updatedTenant = await tenantRepository.findOne({
        where: { id: testTenant.id },
      });
      expect(updatedTenant.settings.branding.theme).toBe(BrandingTheme.DARK);
    });

    it('should return 403 for non-admin users', async () => {
      const brandingDto = {
        theme: BrandingTheme.DARK,
        colors: {
          primary: '#FF5733',
        },
      };

      await request(app.getHttpServer())
        .put('/tenants/branding')
        .set('Authorization', `Bearer ${userToken}`)
        .send(brandingDto)
        .expect(403);
    });

    it('should return 400 for invalid branding configuration', async () => {
      const invalidBrandingDto = {
        colors: {
          primary: 'invalid-color',
        },
      };

      const response = await request(app.getHttpServer())
        .put('/tenants/branding')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBrandingDto)
        .expect(400);

      expect(response.body.message).toBe('Invalid branding configuration');
      expect(response.body.errors).toContain(
        'primary color must be a valid hex color'
      );
    });

    it('should return 400 for dangerous custom CSS', async () => {
      const dangerousBrandingDto = {
        customCss: 'expression(alert("xss"))',
      };

      const response = await request(app.getHttpServer())
        .put('/tenants/branding')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dangerousBrandingDto)
        .expect(400);

      expect(response.body.errors).toContain(
        'Custom CSS contains potentially dangerous content'
      );
    });
  });

  describe('/tenants/branding/validate (POST)', () => {
    it('should validate valid branding configuration', async () => {
      const validBrandingDto = {
        branding: {
          theme: BrandingTheme.LIGHT,
          colors: {
            primary: '#3B82F6',
            secondary: '#6B7280',
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/tenants/branding/validate')
        .send(validBrandingDto)
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.errors).toHaveLength(0);
      expect(response.body.previewUrl).toBeDefined();
    });

    it('should detect invalid branding configuration', async () => {
      const invalidBrandingDto = {
        branding: {
          colors: {
            primary: 'invalid-color',
            secondary: 'another-invalid',
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/tenants/branding/validate')
        .send(invalidBrandingDto)
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.errors).toContain(
        'primary color must be a valid hex color'
      );
      expect(response.body.errors).toContain(
        'secondary color must be a valid hex color'
      );
    });

    it('should provide warnings for accessibility issues', async () => {
      const lowContrastBrandingDto = {
        branding: {
          colors: {
            background: '#FFFFFF',
            text: '#F0F0F0', // Very low contrast
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/tenants/branding/validate')
        .send(lowContrastBrandingDto)
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.warnings).toContain(
        'Text and background colors may not provide sufficient contrast'
      );
    });
  });

  describe('/tenants/branding (DELETE)', () => {
    it('should reset tenant branding to default (admin only)', async () => {
      const response = await request(app.getHttpServer())
        .delete('/tenants/branding')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset to default');
      expect(response.body.branding.theme).toBe(BrandingTheme.LIGHT);

      // Verify the branding was actually reset in the database
      const updatedTenant = await tenantRepository.findOne({
        where: { id: testTenant.id },
      });
      expect(updatedTenant.settings.branding).toBeUndefined();
    });

    it('should return 403 for non-admin users', async () => {
      await request(app.getHttpServer())
        .delete('/tenants/branding')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('/tenants/branding/preview (GET)', () => {
    it('should return branding preview URL', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants/branding/preview')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.previewUrl).toContain(
        '/api/tenants/branding/preview'
      );
      expect(response.body.previewUrl).toContain('theme=light');
      expect(response.body.previewUrl).toContain('primaryColor=%233B82F6');
    });
  });

  describe('/tenants/branding/export (GET)', () => {
    it('should export branding configuration', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants/branding/export')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.configuration).toBeDefined();
      expect(response.body.configuration.theme).toBe(BrandingTheme.LIGHT);
      expect(response.body.exportDate).toBeDefined();
    });
  });

  describe('/tenants/branding/import (POST)', () => {
    it('should import valid branding configuration (admin only)', async () => {
      const importConfiguration = {
        theme: BrandingTheme.DARK,
        colors: {
          primary: '#FF5733',
          secondary: '#33FF57',
        },
        typography: {
          primaryFont: 'Arial, sans-serif',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/tenants/branding/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(importConfiguration)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.branding.theme).toBe(BrandingTheme.DARK);
    });

    it('should return 403 for non-admin users', async () => {
      const importConfiguration = {
        theme: BrandingTheme.DARK,
      };

      await request(app.getHttpServer())
        .post('/tenants/branding/import')
        .set('Authorization', `Bearer ${userToken}`)
        .send(importConfiguration)
        .expect(403);
    });

    it('should return 400 for invalid imported configuration', async () => {
      const invalidConfiguration = {
        colors: {
          primary: 'invalid-color',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/tenants/branding/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidConfiguration)
        .expect(400);

      expect(response.body.message).toBe(
        'Invalid imported branding configuration'
      );
    });
  });

  describe('/tenants/branding/default (GET)', () => {
    it('should return default branding configuration', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants/branding/default')
        .expect(200);

      expect(response.body.theme).toBe(BrandingTheme.LIGHT);
      expect(response.body.colors.primary).toBe('#3B82F6');
      expect(response.body.typography.primaryFont).toBe('Inter, sans-serif');
      expect(response.body.enableCustomBranding).toBe(false);
    });
  });

  describe('/tenants/branding/health (GET)', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants/branding/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('tenant-branding');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Caching behavior', () => {
    it('should cache branding configuration', async () => {
      // First request should cache the result
      const response1 = await request(app.getHttpServer())
        .get('/tenants/branding')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Second request should return cached result
      const response2 = await request(app.getHttpServer())
        .get('/tenants/branding')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response1.body).toEqual(response2.body);
    });

    it('should clear cache after branding update', async () => {
      // Get initial branding
      await request(app.getHttpServer())
        .get('/tenants/branding')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Update branding
      const brandingDto = {
        theme: BrandingTheme.DARK,
        colors: {
          primary: '#FF5733',
        },
      };

      await request(app.getHttpServer())
        .put('/tenants/branding')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(brandingDto)
        .expect(200);

      // Get updated branding (should reflect the change)
      const response = await request(app.getHttpServer())
        .get('/tenants/branding')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.branding.theme).toBe(BrandingTheme.DARK);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close database connection to simulate error
      await dataSource.destroy();

      await request(app.getHttpServer())
        .get('/tenants/branding')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(500);
    });
  });
});
