import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';
import { UserRole, UserStatus } from '@app/shared';
import { JwtService } from '../auth/services/jwt.service';

describe('ProfileController (e2e)', () => {
  let app: INestApplication;
  let userProfileRepository: Repository<UserProfile>;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let authToken: string;
  let testUser: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userProfileRepository = moduleFixture.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile)
    );
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User)
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create a test user
    testUser = userRepository.create({
      email: 'test@example.com',
      password: 'hashedPassword',
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
      tenantId: 'test-tenant-id',
      firstName: 'Test',
      lastName: 'User',
    });
    await userRepository.save(testUser);

    // Generate JWT token
    const tokenPair = jwtService.generateTokenPair({
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
      status: testUser.status,
      tenantId: testUser.tenantId,
    });
    authToken = tokenPair.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await userProfileRepository.delete({});
    await userRepository.delete({});
    await app.close();
  });

  describe('/api/profiles (POST)', () => {
    it('should create a new profile', () => {
      const createProfileDto = {
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        bio: 'Software Developer',
        jobTitle: 'Developer',
        department: 'Engineering',
        location: 'New York',
      };

      return request(app.getHttpServer())
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createProfileDto)
        .expect(201)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.firstName).toBe(createProfileDto.firstName);
          expect(res.body.lastName).toBe(createProfileDto.lastName);
          expect(res.body.displayName).toBe(createProfileDto.displayName);
          expect(res.body.bio).toBe(createProfileDto.bio);
          expect(res.body.jobTitle).toBe(createProfileDto.jobTitle);
          expect(res.body.department).toBe(createProfileDto.department);
          expect(res.body.location).toBe(createProfileDto.location);
          expect(res.body.userId).toBe(testUser.id);
        });
    });

    it('should return 409 if profile already exists', async () => {
      const createProfileDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        displayName: 'Jane Smith',
      };

      await request(app.getHttpServer())
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createProfileDto)
        .expect(409); // Conflict - profile already exists
    });
  });

  describe('/api/profiles/me (GET)', () => {
    it('should return the current user profile', () => {
      return request(app.getHttpServer())
        .get('/api/profiles/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.userId).toBe(testUser.id);
          expect(res.body.firstName).toBe('John');
          expect(res.body.lastName).toBe('Doe');
        });
    });

    it('should return 401 without authorization', () => {
      return request(app.getHttpServer()).get('/api/profiles/me').expect(401);
    });
  });

  describe('/api/profiles/me (PUT)', () => {
    it('should update the current user profile', () => {
      const updateProfileDto = {
        firstName: 'John Updated',
        bio: 'Updated bio',
        jobTitle: 'Senior Developer',
      };

      return request(app.getHttpServer())
        .put('/api/profiles/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateProfileDto)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.firstName).toBe(updateProfileDto.firstName);
          expect(res.body.bio).toBe(updateProfileDto.bio);
          expect(res.body.jobTitle).toBe(updateProfileDto.jobTitle);
          expect(res.body.lastName).toBe('Doe'); // Should remain unchanged
        });
    });
  });

  describe('/api/profiles/me/completion (GET)', () => {
    it('should return profile completion status', () => {
      return request(app.getHttpServer())
        .get('/api/profiles/me/completion')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('completionStatus');
          expect(res.body).toHaveProperty('completionPercentage');
          expect(res.body).toHaveProperty('missingFields');
          expect(res.body).toHaveProperty('totalRequiredFields');
          expect(res.body).toHaveProperty('completedRequiredFields');
          expect(typeof res.body.completionPercentage).toBe('number');
          expect(Array.isArray(res.body.missingFields)).toBe(true);
        });
    });
  });

  describe('/api/profiles/me/avatar (POST)', () => {
    it('should upload avatar', () => {
      const testImageBuffer = Buffer.from('fake-image-data');

      return request(app.getHttpServer())
        .post('/api/profiles/me/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImageBuffer, 'test-avatar.jpg')
        .expect(201)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('avatarUrl');
          expect(res.body).toHaveProperty('avatarFileKey');
          expect(res.body.avatarUrl).toBeTruthy();
          expect(res.body.avatarFileKey).toBeTruthy();
        });
    });

    it('should return 400 for invalid file type', () => {
      const testFileBuffer = Buffer.from('fake-text-data');

      return request(app.getHttpServer())
        .post('/api/profiles/me/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFileBuffer, 'test.txt')
        .expect(400);
    });
  });

  describe('/api/profiles/me/avatar (DELETE)', () => {
    it('should delete avatar', () => {
      return request(app.getHttpServer())
        .delete('/api/profiles/me/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.avatarUrl).toBeNull();
          expect(res.body.avatarFileKey).toBeNull();
        });
    });
  });

  describe('/api/profiles/me (DELETE)', () => {
    it('should delete the current user profile', () => {
      return request(app.getHttpServer())
        .delete('/api/profiles/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 after profile is deleted', () => {
      return request(app.getHttpServer())
        .get('/api/profiles/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
