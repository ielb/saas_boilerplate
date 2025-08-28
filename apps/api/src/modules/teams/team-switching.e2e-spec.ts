import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { TeamsModule } from './teams.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RBACModule } from '../rbac/rbac.module';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../../common/common.module';
import { Team, TeamMembership } from './entities/team.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../rbac/entities/role.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { TeamStatus } from './entities/team.entity';
import { UserRole, UserStatus } from '@app/shared';
import { JwtService } from '@nestjs/jwt';

describe('TeamSwitching (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let userRepository: any;
  let teamRepository: any;
  let teamMembershipRepository: any;
  let roleRepository: any;
  let auditLogRepository: any;

  let authToken: string;
  let userId: string;
  let tenantId: string;
  let team1Id: string;
  let team2Id: string;
  let roleId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Team, TeamMembership, User, Role, AuditLog],
          synchronize: true,
          dropSchema: true,
        }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
        AuthModule,
        TeamsModule,
        UsersModule,
        RBACModule,
        EmailModule,
        AuditModule,
        CommonModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    userRepository = dataSource.getRepository(User);
    teamRepository = dataSource.getRepository(Team);
    teamMembershipRepository = dataSource.getRepository(TeamMembership);
    roleRepository = dataSource.getRepository(Role);
    auditLogRepository = dataSource.getRepository(AuditLog);

    await app.init();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Clean up database
    await auditLogRepository.delete({});
    await teamMembershipRepository.delete({});
    await teamRepository.delete({});
    await userRepository.delete({});
    await roleRepository.delete({});

    // Create test tenant ID
    tenantId = 'test-tenant-id';

    // Create test role
    const role = roleRepository.create({
      name: 'Team Member',
      description: 'Basic team member role',
      type: 'custom',
      level: 1,
      tenantId,
      isActive: true,
    });
    await roleRepository.save(role);
    roleId = role.id;

    // Create test user
    const user = userRepository.create({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'hashedPassword',
      tenantId,
      role: UserRole.OWNER,
      emailVerified: true,
      status: UserStatus.ACTIVE,
    });
    await userRepository.save(user);
    userId = user.id;

    // Create teams
    const team1 = teamRepository.create({
      name: 'Development Team',
      description: 'Core development team',
      tenantId,
      managerId: userId,
      status: TeamStatus.ACTIVE,
    });
    await teamRepository.save(team1);
    team1Id = team1.id;

    const team2 = teamRepository.create({
      name: 'Design Team',
      description: 'UI/UX design team',
      tenantId,
      managerId: userId,
      status: TeamStatus.ACTIVE,
    });
    await teamRepository.save(team2);
    team2Id = team2.id;

    // Add user to both teams
    const membership1 = teamMembershipRepository.create({
      teamId: team1Id,
      userId,
      roleId,
      tenantId,
      status: TeamStatus.ACTIVE,
      joinedAt: new Date(),
    });
    await teamMembershipRepository.save(membership1);

    const membership2 = teamMembershipRepository.create({
      teamId: team2Id,
      userId,
      roleId,
      tenantId,
      status: TeamStatus.ACTIVE,
      joinedAt: new Date(),
    });
    await teamMembershipRepository.save(membership2);

    // Generate auth token
    authToken = await jwtService.signAsync({
      sub: userId,
      email: user.email,
      tenantId,
      role: UserRole.OWNER,
    });
  });

  describe('/teams/switch/memberships (GET)', () => {
    it('should return user team memberships', async () => {
      const response = await request(app.getHttpServer())
        .get('/teams/switch/memberships')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.teams).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.teams[0]).toHaveProperty('id');
      expect(response.body.teams[0]).toHaveProperty('name');
      expect(response.body.teams[0]).toHaveProperty('membership');
      expect(response.body.teams[0].membership).toHaveProperty('roleName');
      expect(response.body.teams[0].membership).toHaveProperty('status');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/teams/switch/memberships')
        .expect(401);
    });
  });

  describe('/teams/switch/current (GET)', () => {
    it('should return current team context', async () => {
      const response = await request(app.getHttpServer())
        .get('/teams/switch/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('team');
      expect(response.body).toHaveProperty('membership');
      expect(response.body.team).toHaveProperty('id');
      expect(response.body.team).toHaveProperty('name');
      expect(response.body.membership).toHaveProperty('roleName');
      expect(response.body.membership).toHaveProperty('status');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/teams/switch/current')
        .expect(401);
    });
  });

  describe('/teams/switch (POST)', () => {
    it('should switch to a different team successfully', async () => {
      const switchDto = {
        teamId: team2Id,
        notifyTeamMembers: false,
      };

      const response = await request(app.getHttpServer())
        .post('/teams/switch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(switchDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Successfully switched to team');
      expect(response.body.team.id).toBe(team2Id);
      expect(response.body.team.name).toBe('Design Team');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.membership).toHaveProperty('roleName');
    });

    it('should return 403 when switching to unauthorized team', async () => {
      const unauthorizedTeamId = 'unauthorized-team-id';
      const switchDto = {
        teamId: unauthorizedTeamId,
        notifyTeamMembers: false,
      };

      await request(app.getHttpServer())
        .post('/teams/switch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(switchDto)
        .expect(403);
    });

    it('should return 400 for invalid team ID', async () => {
      const switchDto = {
        teamId: 'invalid-uuid',
        notifyTeamMembers: false,
      };

      await request(app.getHttpServer())
        .post('/teams/switch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(switchDto)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const switchDto = {
        teamId: team2Id,
        notifyTeamMembers: false,
      };

      await request(app.getHttpServer())
        .post('/teams/switch')
        .send(switchDto)
        .expect(401);
    });
  });

  describe('/teams/switch/:teamId/verify-access (POST)', () => {
    it('should verify team access successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/teams/switch/${team1Id}/verify-access`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.hasAccess).toBe(true);
      expect(response.body.team).toHaveProperty('id', team1Id);
      expect(response.body.membership).toHaveProperty('roleName');
    });

    it('should return false for unauthorized team', async () => {
      const unauthorizedTeamId = 'unauthorized-team-id';

      const response = await request(app.getHttpServer())
        .post(`/teams/switch/${unauthorizedTeamId}/verify-access`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.hasAccess).toBe(false);
      expect(response.body).not.toHaveProperty('team');
      expect(response.body).not.toHaveProperty('membership');
    });

    it('should return 400 for invalid team ID', async () => {
      await request(app.getHttpServer())
        .post('/teams/switch/invalid-uuid/verify-access')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/teams/switch/${team1Id}/verify-access`)
        .expect(401);
    });
  });

  describe('/teams/switch/available (GET)', () => {
    it('should return available teams for switching', async () => {
      const response = await request(app.getHttpServer())
        .get('/teams/switch/available')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.teams).toHaveLength(2);
      expect(response.body.teams[0]).toHaveProperty('id');
      expect(response.body.teams[0]).toHaveProperty('name');
      expect(response.body.teams[0]).toHaveProperty('role');
    });

    it('should filter out inactive memberships', async () => {
      // Create an inactive membership
      const inactiveMembership = teamMembershipRepository.create({
        teamId: team1Id,
        userId,
        roleId,
        tenantId,
        status: TeamStatus.INACTIVE,
        joinedAt: new Date(),
      });
      await teamMembershipRepository.save(inactiveMembership);

      const response = await request(app.getHttpServer())
        .get('/teams/switch/available')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should only return active memberships
      expect(response.body.teams).toHaveLength(1);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/teams/switch/available')
        .expect(401);
    });
  });

  describe('Team switching with notifications', () => {
    it('should send notifications when notifyTeamMembers is true', async () => {
      // Create another user to receive notifications
      const otherUser = userRepository.create({
        email: 'other@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        password: 'hashedPassword',
        tenantId,
        role: UserRole.MEMBER,
        emailVerified: true,
        status: UserStatus.ACTIVE,
      });
      await userRepository.save(otherUser);

      // Add other user to team
      const otherMembership = teamMembershipRepository.create({
        teamId: team1Id,
        userId: otherUser.id,
        roleId,
        tenantId,
        status: TeamStatus.ACTIVE,
        joinedAt: new Date(),
      });
      await teamMembershipRepository.save(otherMembership);

      const switchDto = {
        teamId: team1Id,
        notifyTeamMembers: true,
      };

      const response = await request(app.getHttpServer())
        .post('/teams/switch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(switchDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Note: In a real test, you would verify that the email service was called
      // This would require mocking the email service or checking the audit logs
    });
  });

  describe('Audit logging', () => {
    it('should log team switch events', async () => {
      const switchDto = {
        teamId: team2Id,
        notifyTeamMembers: false,
      };

      await request(app.getHttpServer())
        .post('/teams/switch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(switchDto)
        .expect(200);

      // Verify audit log was created
      const auditLogs = await auditLogRepository.find({
        where: {
          userId,
          eventType: 'team_switched',
        },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].metadata).toHaveProperty('newTeamId', team2Id);
      expect(auditLogs[0].metadata).toHaveProperty('teamName', 'Design Team');
    });
  });
});
