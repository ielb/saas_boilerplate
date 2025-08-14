import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TenantController } from './controllers/tenant.controller';
import { TenantService } from './tenant.service';
import { Tenant } from '../auth/entities/tenant.entity';
import {
  TenantFeatureFlag,
  TenantFeature,
} from '../auth/entities/tenant-feature-flag.entity';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '@app/shared';
import { AuthModule } from '../auth/auth.module';
import { TenantsModule } from './tenants.module';
import { TestDatabaseConfig } from '../../config/test-database.config';

describe('Tenant Feature Flags (e2e)', () => {
  let app: INestApplication;
  let jwtService: any;
  let testTenant: Tenant;
  let adminUser: User;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [TestDatabaseConfig],
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            ...configService.get('database'),
            entities: [Tenant, TenantFeatureFlag, User],
            synchronize: true,
            dropSchema: true,
          }),
          inject: [ConfigService],
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET') || 'test-secret',
            signOptions: { expiresIn: '1h' },
          }),
          inject: [ConfigService],
        }),
        AuthModule,
        TenantsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get('JwtService');
    await app.init();

    // Create test tenant and admin user
    const tenantService = moduleFixture.get<TenantService>(TenantService);

    testTenant = await tenantService.createTenant({
      name: 'Test Tenant',
      domain: 'test-tenant.com',
    });

    // Create admin user
    const userRepository = moduleFixture.get('UserRepository');
    adminUser = await userRepository.save({
      email: 'admin@test-tenant.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      tenantId: testTenant.id,
    });

    // Generate admin token
    adminToken = jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      tenantId: testTenant.id,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /tenants/:id/features', () => {
    it('should return all feature flags for tenant', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/tenants/${testTenant.id}/features`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assert
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const featureFlag = response.body[0];
      expect(featureFlag).toHaveProperty('id');
      expect(featureFlag).toHaveProperty('tenantId');
      expect(featureFlag).toHaveProperty('feature');
      expect(featureFlag).toHaveProperty('isEnabled');
      expect(featureFlag).toHaveProperty('createdAt');
      expect(featureFlag).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent tenant', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/tenants/non-existent-id/features')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get(`/api/tenants/${testTenant.id}/features`)
        .expect(401);
    });
  });

  describe('GET /tenants/:id/features/:feature', () => {
    it('should return feature status when feature exists', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/tenants/${testTenant.id}/features/mfa_enforcement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('enabled');
      expect(typeof response.body.enabled).toBe('boolean');
    });

    it('should return 400 for invalid feature name', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get(`/api/tenants/${testTenant.id}/features/invalid_feature`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 404 for non-existent tenant', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/tenants/non-existent-id/features/mfa_enforcement')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should accept different case formats for feature names', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get(`/api/tenants/${testTenant.id}/features/MFA_ENFORCEMENT`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('PUT /tenants/:id/features/:feature', () => {
    it('should update feature flag successfully', async () => {
      // Arrange
      const updateData = {
        enabled: true,
        config: { maxRetries: 3, timeout: 5000 },
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/api/tenants/${testTenant.id}/features/mfa_enforcement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('tenantId', testTenant.id);
      expect(response.body).toHaveProperty('feature', 'mfa_enforcement');
      expect(response.body).toHaveProperty('isEnabled', true);
      expect(response.body).toHaveProperty('config');
      expect(response.body.config).toEqual(updateData.config);
    });

    it('should update feature flag without config', async () => {
      // Arrange
      const updateData = {
        enabled: false,
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/api/tenants/${testTenant.id}/features/sso_integration`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('isEnabled', false);
      expect(response.body).toHaveProperty('config');
    });

    it('should return 400 for invalid feature name', async () => {
      // Arrange
      const updateData = {
        enabled: true,
      };

      // Act & Assert
      await request(app.getHttpServer())
        .put(`/api/tenants/${testTenant.id}/features/invalid_feature`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should return 400 for invalid request body', async () => {
      // Arrange
      const invalidData = {
        enabled: 'not_a_boolean',
        config: 'not_an_object',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .put(`/api/tenants/${testTenant.id}/features/mfa_enforcement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should return 404 for non-existent tenant', async () => {
      // Arrange
      const updateData = {
        enabled: true,
      };

      // Act & Assert
      await request(app.getHttpServer())
        .put('/api/tenants/non-existent-id/features/mfa_enforcement')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const updateData = {
        enabled: true,
      };

      // Act & Assert
      await request(app.getHttpServer())
        .put(`/api/tenants/${testTenant.id}/features/mfa_enforcement`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('Feature Flag Validation', () => {
    it('should validate all feature enum values', async () => {
      // Arrange
      const validFeatures = [
        'mfa_enforcement',
        'sso_integration',
        'password_policy',
        'bulk_user_import',
        'user_provisioning',
        'advanced_roles',
        'email_templates',
        'sms_notifications',
        'push_notifications',
        'advanced_file_management',
        'file_versioning',
        'file_encryption',
        'advanced_analytics',
        'custom_reports',
        'export_capabilities',
        'api_webhooks',
        'third_party_integrations',
        'custom_integrations',
        'advanced_security',
        'audit_logging',
        'compliance_reporting',
        'usage_based_billing',
        'advanced_billing',
        'invoice_customization',
        'websocket_features',
        'real_time_collaboration',
        'live_chat',
        'admin_dashboard',
        'system_monitoring',
        'backup_restore',
      ];

      // Act & Assert
      for (const feature of validFeatures) {
        await request(app.getHttpServer())
          .get(`/api/tenants/${testTenant.id}/features/${feature}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });

    it('should reject invalid feature names with helpful error message', async () => {
      // Arrange
      const invalidFeatures = [
        'invalid_feature',
        'unknown_feature',
        'test_feature',
        'random_string',
      ];

      // Act & Assert
      for (const feature of invalidFeatures) {
        const response = await request(app.getHttpServer())
          .get(`/api/tenants/${testTenant.id}/features/${feature}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);

        expect(response.body.message).toContain('Invalid feature');
        expect(response.body.message).toContain('Valid features are');
      }
    });
  });

  describe('Feature Flag Configuration', () => {
    it('should handle complex configuration objects', async () => {
      // Arrange
      const complexConfig = {
        maxRetries: 3,
        timeout: 5000,
        retryDelay: 1000,
        enabled: true,
        settings: {
          strict: true,
          fallback: false,
        },
        array: [1, 2, 3],
        nested: {
          deep: {
            value: 'test',
          },
        },
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/api/tenants/${testTenant.id}/features/advanced_analytics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enabled: true,
          config: complexConfig,
        })
        .expect(200);

      // Assert
      expect(response.body.config).toEqual(complexConfig);
    });

    it('should merge configuration with existing config', async () => {
      // Arrange
      const initialConfig = { maxRetries: 3, timeout: 5000 };
      const additionalConfig = { retryDelay: 1000, enabled: true };

      // Act - Set initial config
      await request(app.getHttpServer())
        .put(`/api/tenants/${testTenant.id}/features/audit_logging`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enabled: true,
          config: initialConfig,
        })
        .expect(200);

      // Act - Update with additional config
      const response = await request(app.getHttpServer())
        .put(`/api/tenants/${testTenant.id}/features/audit_logging`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enabled: true,
          config: additionalConfig,
        })
        .expect(200);

      // Assert
      expect(response.body.config).toEqual({
        ...initialConfig,
        ...additionalConfig,
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent feature flag requests', async () => {
      // Arrange
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app.getHttpServer())
          .get(`/api/tenants/${testTenant.id}/features/mfa_enforcement`)
          .set('Authorization', `Bearer ${adminToken}`)
      );

      // Act
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in less than 5 seconds
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('enabled');
      });
    });
  });
});
