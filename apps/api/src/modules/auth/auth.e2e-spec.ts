import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth.module';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { RefreshToken } from './entities/refresh-token.entity';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  };

  const testTenant = {
    name: 'Test Company',
    domain: 'testcompany.com',
    description: 'Test tenant',
    contactEmail: 'admin@testcompany.com',
    contactPhone: '+1234567890',
    address: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    postalCode: '12345',
    country: 'US',
    timezone: 'America/New_York',
    locale: 'en-US',
    currency: 'USD',
    marketingConsent: true,
    acceptTerms: true,
  };

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
          entities: [User, Tenant, RefreshToken],
          synchronize: true,
          logging: false,
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          ...testTenant,
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('tenantId');
      expect(response.body.message).toBe(
        'User and tenant created successfully'
      );
    });

    it('should reject registration with existing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          ...testTenant,
        })
        .expect(409);
    });

    it('should reject registration with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
          ...testTenant,
        })
        .expect(400);
    });

    it('should reject registration with weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          password: 'weak',
          ...testTenant,
        })
        .expect(400);
    });
  });

  describe('User Login', () => {
    it('should login user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject login with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);
    });
  });

  describe('Email Verification', () => {
    it('should verify email with valid token', async () => {
      // This test would require getting a valid verification token from the database
      // For now, we'll test the endpoint structure
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          token: 'valid-verification-token',
        })
        .expect(200);
    });

    it('should reject email verification with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          token: 'invalid-token',
        })
        .expect(400);
    });

    it('should resend email verification', async () => {
      await request(app.getHttpServer())
        .post('/auth/resend-email-verification')
        .send({
          email: testUser.email,
        })
        .expect(200);
    });
  });

  describe('Password Reset', () => {
    it('should send password reset email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: testUser.email,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Password reset email sent');
    });

    it('should handle forgot password for non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Password reset email sent');
    });

    it('should reset password with valid token', async () => {
      // This test would require getting a valid reset token from the database
      // For now, we'll test the endpoint structure
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'NewSecurePassword123!',
        })
        .expect(200);
    });

    it('should reject password reset with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewSecurePassword123!',
        })
        .expect(400);
    });

    it('should reject password reset with weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'weak',
        })
        .expect(400);
    });
  });

  describe('Token Refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // Get a valid refresh token by logging in
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body).toHaveProperty('user');
    });

    it('should reject refresh with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });
  });

  describe('User Profile', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Get a valid access token by logging in
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
      expect(response.body.email).toBe(testUser.email);
    });

    it('should reject profile access without token', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should reject profile access with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      // Get valid tokens by logging in
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should logout user successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          refreshToken,
        })
        .expect(200);
    });

    it('should reject logout without token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({
          refreshToken,
        })
        .expect(401);
    });
  });

  describe('Multi-Factor Authentication', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Get a valid access token by logging in
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should setup MFA successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/mfa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: 'user-id', // This would be the actual user ID
        })
        .expect(200);

      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('backupCodes');
      expect(response.body.backupCodes).toHaveLength(10);
    });

    it('should enable MFA with valid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/mfa/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token: '123456', // This would be a valid TOTP token
        })
        .expect(200);
    });

    it('should get MFA status', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/mfa/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('isEnabled');
      expect(response.body).toHaveProperty('isVerified');
      expect(response.body).toHaveProperty('backupCodesRemaining');
    });

    it('should verify MFA token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/mfa/verify')
        .send({
          token: '123456', // This would be a valid TOTP token
          userId: 'user-id', // This would be the actual user ID
        })
        .expect(200);

      expect(response.body).toHaveProperty('isValid');
      expect(response.body).toHaveProperty('message');
    });

    it('should regenerate backup codes', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/mfa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token: '123456', // This would be a valid TOTP token
        })
        .expect(200);

      expect(response.body).toHaveProperty('backupCodes');
      expect(response.body.backupCodes).toHaveLength(10);
    });

    it('should disable MFA', async () => {
      await request(app.getHttpServer())
        .post('/auth/mfa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token: '123456', // This would be a valid TOTP token
        })
        .expect(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should limit forgot password requests', async () => {
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 4; i++) {
        const expectedStatus = i < 3 ? 200 : 429; // First 3 should succeed, 4th should be rate limited
        await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({
            email: testUser.email,
          })
          .expect(expectedStatus);
      }
    });

    it('should limit reset password requests', async () => {
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 6; i++) {
        const expectedStatus = i < 5 ? 400 : 429; // First 5 should fail due to invalid token, 6th should be rate limited
        await request(app.getHttpServer())
          .post('/auth/reset-password')
          .send({
            token: 'invalid-token',
            newPassword: 'NewSecurePassword123!',
          })
          .expect(expectedStatus);
      }
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });
});
