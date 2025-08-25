import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FilesModule } from './files.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../../common/common.module';
import { FileStatus, FileVisibility } from './entities/file.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Session } from '../auth/entities/session.entity';
import { Role } from '../rbac/entities/role.entity';
import { Permission } from '../rbac/entities/permission.entity';
import { UserTenantMembership } from '../tenants/entities/user-tenant-membership.entity';
import { File } from './entities/file.entity';

describe('FilesController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'saas_boilerplate_test',
          entities: [
            User,
            Tenant,
            RefreshToken,
            Session,
            Role,
            Permission,
            UserTenantMembership,
            File,
          ],
          synchronize: true,
          logging: false,
        }),
        CommonModule,
        AuthModule,
        FilesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test user and get auth token
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.data.accessToken;
    userId = registerResponse.body.data.user.id;

    // Create test tenant
    const tenantResponse = await request(app.getHttpServer())
      .post('/api/tenants')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Tenant',
        domain: 'test.com',
      });

    expect(tenantResponse.status).toBe(201);
    tenantId = tenantResponse.body.data.id;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('/api/files/upload (POST)', () => {
    it('should upload a file successfully', async () => {
      const fileBuffer = Buffer.from('test file content');

      const response = await request(app.getHttpServer())
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', fileBuffer, 'test-file.txt')
        .field('visibility', FileVisibility.PRIVATE)
        .field('metadata[description]', 'Test file for upload');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('key');
      expect(response.body.data.originalName).toBe('test-file.txt');
      expect(response.body.data.status).toBe(FileStatus.READY);
      expect(response.body.data.visibility).toBe(FileVisibility.PRIVATE);
      expect(response.body.data.metadata.description).toBe(
        'Test file for upload'
      );
    });

    it('should reject file with invalid type', async () => {
      const fileBuffer = Buffer.from('malicious content');

      const response = await request(app.getHttpServer())
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', fileBuffer, 'malicious.exe');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('File type not allowed');
    });

    it('should reject file that exceeds size limit', async () => {
      const largeFileBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      const response = await request(app.getHttpServer())
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', largeFileBuffer, 'large-file.txt');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('File size exceeds maximum');
    });

    it('should require authentication', async () => {
      const fileBuffer = Buffer.from('test content');

      const response = await request(app.getHttpServer())
        .post('/api/files/upload')
        .attach('file', fileBuffer, 'test.txt');

      expect(response.status).toBe(401);
    });
  });

  describe('/api/files/metadata/:key (GET)', () => {
    let fileKey: string;

    beforeEach(async () => {
      // Upload a test file first
      const fileBuffer = Buffer.from('test content for metadata');
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', fileBuffer, 'metadata-test.txt');

      fileKey = uploadResponse.body.data.key;
    });

    it('should return file metadata', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/files/metadata/${fileKey}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('key', fileKey);
      expect(response.body).toHaveProperty('originalName', 'metadata-test.txt');
      expect(response.body).toHaveProperty('size');
      expect(response.body).toHaveProperty('mimeType');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('visibility');
    });

    it('should return 404 for non-existent file', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/files/metadata/non-existent-key')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId);

      expect(response.status).toBe(404);
    });
  });

  describe('/api/files/download/:key (GET)', () => {
    let fileKey: string;

    beforeEach(async () => {
      // Upload a test file first
      const fileBuffer = Buffer.from('test content for download');
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', fileBuffer, 'download-test.txt');

      fileKey = uploadResponse.body.data.key;
    });

    it('should download file successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/files/download/${fileKey}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain(
        'download-test.txt'
      );
      expect(response.body.toString()).toBe('test content for download');
    });
  });

  describe('/api/files/list (GET)', () => {
    beforeEach(async () => {
      // Upload multiple test files
      const files = [
        { content: 'file 1 content', name: 'file1.txt' },
        { content: 'file 2 content', name: 'file2.txt' },
        { content: 'file 3 content', name: 'file3.txt' },
      ];

      for (const file of files) {
        await request(app.getHttpServer())
          .post('/api/files/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', tenantId)
          .attach('file', Buffer.from(file.content), file.name);
      }
    });

    it('should list files with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/files/list')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('files');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 10);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.data.files)).toBe(true);
    });

    it('should filter files by prefix', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/files/list')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .query({ prefix: 'uploads' });

      expect(response.status).toBe(200);
      expect(response.body.data.files.length).toBeGreaterThan(0);
    });

    it('should search files by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/files/list')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .query({ search: 'file1' });

      expect(response.status).toBe(200);
      expect(response.body.data.files.length).toBeGreaterThan(0);
      expect(response.body.data.files[0].originalName).toContain('file1');
    });
  });

  describe('/api/files/signed-url (POST)', () => {
    let fileKey: string;

    beforeEach(async () => {
      // Upload a test file first
      const fileBuffer = Buffer.from('test content for signed url');
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', fileBuffer, 'signed-url-test.txt');

      fileKey = uploadResponse.body.data.key;
    });

    it('should generate signed URL', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/files/signed-url')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          key: fileKey,
          expiresIn: 3600,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('signedUrl');
      expect(response.body.data).toHaveProperty('expiresAt');
      expect(response.body.data).toHaveProperty('key', fileKey);
      expect(response.body.data.signedUrl).toContain('http');
    });
  });

  describe('/api/files/copy (POST)', () => {
    let sourceFileKey: string;

    beforeEach(async () => {
      // Upload a test file first
      const fileBuffer = Buffer.from('test content for copy');
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', fileBuffer, 'copy-test.txt');

      sourceFileKey = uploadResponse.body.data.key;
    });

    it('should copy file successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/files/copy')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          sourceKey: sourceFileKey,
          destinationKey: 'uploads/copied-file.txt',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sourceKey', sourceFileKey);
      expect(response.body.data).toHaveProperty(
        'destinationKey',
        'uploads/copied-file.txt'
      );
      expect(response.body.data).toHaveProperty('metadata');
    });
  });

  describe('/api/files/move (POST)', () => {
    let sourceFileKey: string;

    beforeEach(async () => {
      // Upload a test file first
      const fileBuffer = Buffer.from('test content for move');
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', fileBuffer, 'move-test.txt');

      sourceFileKey = uploadResponse.body.data.key;
    });

    it('should move file successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/files/move')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          sourceKey: sourceFileKey,
          destinationKey: 'uploads/moved-file.txt',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sourceKey', sourceFileKey);
      expect(response.body.data).toHaveProperty(
        'destinationKey',
        'uploads/moved-file.txt'
      );
      expect(response.body.data).toHaveProperty('metadata');
    });
  });

  describe('/api/files/delete/:key (DELETE)', () => {
    let fileKey: string;

    beforeEach(async () => {
      // Upload a test file first
      const fileBuffer = Buffer.from('test content for delete');
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', fileBuffer, 'delete-test.txt');

      fileKey = uploadResponse.body.data.key;
    });

    it('should delete file successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/files/${fileKey}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId);

      expect(response.status).toBe(204);

      // Verify file is deleted by trying to get metadata
      const metadataResponse = await request(app.getHttpServer())
        .get(`/api/files/metadata/${fileKey}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId);

      expect(metadataResponse.status).toBe(404);
    });
  });

  describe('/api/files/health (GET)', () => {
    it('should return storage health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/files/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('providers');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(
        response.body.data.status
      );
    });
  });

  describe('/api/files/providers (GET)', () => {
    it('should return available storage providers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/files/providers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('/api/files/stats (GET)', () => {
    it('should return storage statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/files/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalFiles');
      expect(response.body.data).toHaveProperty('totalSize');
      expect(response.body.data).toHaveProperty('averageFileSize');
      expect(response.body.data).toHaveProperty('filesByStatus');
      expect(response.body.data).toHaveProperty('filesByVisibility');
    });
  });

  describe('/api/files/exists/:key (GET)', () => {
    let fileKey: string;

    beforeEach(async () => {
      // Upload a test file first
      const fileBuffer = Buffer.from('test content for exists check');
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .attach('file', fileBuffer, 'exists-test.txt');

      fileKey = uploadResponse.body.data.key;
    });

    it('should return true for existing file', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/files/exists/${fileKey}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(true);
      expect(response.body.data.key).toBe(fileKey);
    });

    it('should return false for non-existing file', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/files/exists/non-existent-key')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(false);
      expect(response.body.data.key).toBe('non-existent-key');
    });
  });
});
