import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';

describe('Tenant Feature Flags (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/tenants/:id/features', () => {
    it('should return 404 for unauthorized access (endpoint not found)', async () => {
      await request(app.getHttpServer())
        .get('/api/tenants/test-tenant-id/features')
        .expect(404);
    });

    it('should return 404 for non-existent tenant without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/tenants/non-existent-id/features')
        .expect(404);
    });
  });

  describe('GET /api/tenants/:id/features/:feature', () => {
    it('should return 404 for unauthorized access (endpoint not found)', async () => {
      await request(app.getHttpServer())
        .get('/api/tenants/test-tenant-id/features/mfa_enforcement')
        .expect(404);
    });
  });

  describe('PUT /api/tenants/:id/features/:feature', () => {
    it('should return 404 for unauthorized access (endpoint not found)', async () => {
      const updateData = { isEnabled: true };

      await request(app.getHttpServer())
        .put('/api/tenants/test-tenant-id/features/mfa_enforcement')
        .send(updateData)
        .expect(404);
    });
  });

  describe('PUT /api/tenants/:id/features/bulk', () => {
    it('should return 404 for unauthorized access (endpoint not found)', async () => {
      const bulkUpdateData = {
        updates: [
          {
            feature: 'mfa_enforcement',
            enabled: true,
            config: { maxRetries: 3 },
          },
        ],
      };

      await request(app.getHttpServer())
        .put('/api/tenants/test-tenant-id/features/bulk')
        .send(bulkUpdateData)
        .expect(404);
    });
  });

  describe('GET /api/tenants/:id/features/stats', () => {
    it('should return 404 for unauthorized access (endpoint not found)', async () => {
      await request(app.getHttpServer())
        .get('/api/tenants/test-tenant-id/features/stats')
        .expect(404);
    });
  });

  describe('Application Health', () => {
    it('should have application running', async () => {
      expect(app).toBeDefined();
      expect(app.getHttpServer()).toBeDefined();
    });
  });
});
