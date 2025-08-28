import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtService } from '../../auth/services/jwt.service';
import { TeamSwitchingService } from './team-switching.service';
import { TeamRepository } from '../repositories/team.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { AuditService } from '../../audit/services/audit.service';
import { EmailService } from '../../email/services/email.service';
import { Team, TeamMembership, TeamStatus } from '../entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../rbac/entities/role.entity';
import { AuditEventType } from '../../audit/entities/audit-log.entity';
import { TeamSwitchDto } from '../dto/team-switch.dto';

describe('TeamSwitchingService', () => {
  let service: TeamSwitchingService;
  let teamRepository: jest.Mocked<TeamRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let auditService: jest.Mocked<AuditService>;
  let emailService: jest.Mocked<EmailService>;
  let jwtService: jest.Mocked<JwtService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockTeam: Team = {
    id: 'team-1',
    name: 'Development Team',
    description: 'Core development team',
    status: TeamStatus.ACTIVE,
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Team;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockRole: Role = {
    id: 'role-1',
    name: 'Developer',
    description: 'Development team member',
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Role;

  const mockMembership: TeamMembership = {
    id: 'membership-1',
    teamId: 'team-1',
    userId: 'user-1',
    roleId: 'role-1',
    status: TeamStatus.ACTIVE,
    joinedAt: new Date(),
    lastAccessedAt: new Date(),
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    team: mockTeam,
    user: mockUser,
    role: mockRole,
  } as TeamMembership;

  beforeEach(async () => {
    const mockTeamRepository = {
      findUserTeamsWithMemberships: jest.fn(),
      findTeamMember: jest.fn(),
      findTeamWithDetails: jest.fn(),
      findUserTeams: jest.fn(),
      updateMembershipLastAccessed: jest.fn(),
    };

    const mockUserRepository = {
      findOneByIdForTenant: jest.fn(),
      update: jest.fn(),
    };

    const mockAuditService = {
      logEvent: jest.fn(),
    };

    const mockEmailService = {
      sendTeamSwitchNotification: jest.fn(),
    };

    const mockJwtService = {
      generateAccessToken: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamSwitchingService,
        {
          provide: TeamRepository,
          useValue: mockTeamRepository,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TeamSwitchingService>(TeamSwitchingService);
    teamRepository = module.get(TeamRepository);
    userRepository = module.get(UserRepository);
    auditService = module.get(AuditService);
    emailService = module.get(EmailService);
    jwtService = module.get(JwtService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserTeamMemberships', () => {
    it('should return user team memberships successfully', async () => {
      const userId = 'user-1';
      const tenantId = 'tenant-1';
      const mockResult = {
        teams: [
          {
            ...mockTeam,
            membership: mockMembership,
            memberCount: 5,
          },
        ],
        total: 1,
      };

      teamRepository.findUserTeamsWithMemberships.mockResolvedValue(mockResult);

      const result = await service.getUserTeamMemberships(userId, tenantId);

      expect(teamRepository.findUserTeamsWithMemberships).toHaveBeenCalledWith(
        userId,
        tenantId
      );
      expect(result).toEqual({
        teams: [
          {
            id: mockTeam.id,
            name: mockTeam.name,
            description: mockTeam.description,
            status: mockTeam.status,
            avatarUrl: mockTeam.avatarUrl,
            membership: {
              id: mockMembership.id,
              roleId: mockMembership.roleId,
              roleName: mockMembership.role?.name || 'Unknown',
              status: mockMembership.status,
              joinedAt: mockMembership.joinedAt,
              lastAccessedAt: mockMembership.lastAccessedAt,
            },
            memberCount: 5,
          },
        ],
        total: 1,
      });
    });
  });

  describe('getCurrentTeamContext', () => {
    it('should return current team context when user has current team', async () => {
      const userId = 'user-1';
      const tenantId = 'tenant-1';
      const mockUserWithCurrentTeam = {
        ...mockUser,
        currentTeamId: 'team-1',
      };

      userRepository.findOneByIdForTenant.mockResolvedValue(
        mockUserWithCurrentTeam as any
      );
      teamRepository.findTeamMember.mockResolvedValue(mockMembership);
      teamRepository.findTeamWithDetails.mockResolvedValue(mockTeam);

      const result = await service.getCurrentTeamContext(userId, tenantId);

      expect(userRepository.findOneByIdForTenant).toHaveBeenCalledWith(userId);
      expect(teamRepository.findTeamMember).toHaveBeenCalledWith(
        'team-1',
        userId,
        tenantId
      );
      expect(teamRepository.findTeamWithDetails).toHaveBeenCalledWith(
        'team-1',
        tenantId
      );
      expect(result).toEqual({
        team: {
          id: mockTeam.id,
          name: mockTeam.name,
          description: mockTeam.description,
          status: mockTeam.status,
          avatarUrl: mockTeam.avatarUrl,
        },
        membership: {
          id: mockMembership.id,
          roleId: mockMembership.roleId,
          roleName: mockMembership.role?.name || 'Unknown',
          status: mockMembership.status,
          joinedAt: mockMembership.joinedAt,
          lastAccessedAt: mockMembership.lastAccessedAt,
        },
      });
    });

    it('should return first available team when user has no current team', async () => {
      const userId = 'user-1';
      const tenantId = 'tenant-1';

      userRepository.findOneByIdForTenant.mockResolvedValue(mockUser);
      teamRepository.findUserTeams.mockResolvedValue([mockTeam]);
      teamRepository.findTeamMember.mockResolvedValue(mockMembership);

      const result = await service.getCurrentTeamContext(userId, tenantId);

      expect(teamRepository.findUserTeams).toHaveBeenCalledWith(
        userId,
        tenantId
      );
      expect(result).toEqual({
        team: {
          id: mockTeam.id,
          name: mockTeam.name,
          description: mockTeam.description,
          status: mockTeam.status,
          avatarUrl: mockTeam.avatarUrl,
        },
        membership: {
          id: mockMembership.id,
          roleId: mockMembership.roleId,
          roleName: mockMembership.role?.name || 'Unknown',
          status: mockMembership.status,
          joinedAt: mockMembership.joinedAt,
          lastAccessedAt: mockMembership.lastAccessedAt,
        },
      });
    });

    it('should throw NotFoundException when user is not a member of any teams', async () => {
      const userId = 'user-1';
      const tenantId = 'tenant-1';

      userRepository.findOneByIdForTenant.mockResolvedValue(mockUser);
      teamRepository.findUserTeams.mockResolvedValue([]);

      await expect(
        service.getCurrentTeamContext(userId, tenantId)
      ).rejects.toThrow('User is not a member of any teams');
    });
  });

  describe('switchTeam', () => {
    it('should switch team successfully', async () => {
      const userId = 'user-1';
      const tenantId = 'tenant-1';
      const switchDto: TeamSwitchDto = {
        teamId: 'team-1',
        notifyTeamMembers: true,
      };
      const mockToken = 'new-jwt-token';

      const mockTransaction = jest.fn().mockImplementation(async callback => {
        return await callback({
          save: jest.fn().mockResolvedValue(mockMembership),
        });
      });

      dataSource.transaction.mockImplementation(mockTransaction);
      teamRepository.findTeamMember.mockResolvedValue(mockMembership);
      teamRepository.findTeamWithDetails.mockResolvedValue(mockTeam);
      userRepository.findOneByIdForTenant.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);
      jwtService.generateAccessToken.mockReturnValue(mockToken);
      auditService.logEvent.mockResolvedValue({} as any);
      emailService.sendTeamSwitchNotification.mockResolvedValue(undefined);

      const result = await service.switchTeam(userId, switchDto, tenantId);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(teamRepository.findTeamMember).toHaveBeenCalledWith(
        switchDto.teamId,
        userId,
        tenantId
      );
      expect(teamRepository.findTeamWithDetails).toHaveBeenCalledWith(
        switchDto.teamId,
        tenantId
      );
      expect(userRepository.update).toHaveBeenCalledWith(
        { id: userId },
        { metadata: { currentTeamId: switchDto.teamId } }
      );
      expect(jwtService.generateAccessToken).toHaveBeenCalledWith({
        sub: userId,
        email: mockUser.email,
        tenantId: tenantId,
        role: mockUser.role,
      });
      expect(auditService.logEvent).toHaveBeenCalledWith({
        eventType: AuditEventType.TEAM_SWITCHED,
        userId,
        tenantId,
        description: `User switched from team none to team "${mockTeam.name}"`,
        metadata: {
          previousTeamId: undefined,
          newTeamId: switchDto.teamId,
          teamName: mockTeam.name,
          membershipId: mockMembership.id,
        },
      });
      // Note: Email notification is tested separately in integration tests
      expect(result).toEqual({
        success: true,
        message: `Successfully switched to team "${mockTeam.name}"`,
        team: {
          id: mockTeam.id,
          name: mockTeam.name,
          description: mockTeam.description,
          status: mockTeam.status,
          avatarUrl: mockTeam.avatarUrl,
        },
        membership: {
          id: mockMembership.id,
          roleId: mockMembership.roleId,
          roleName: mockMembership.role?.name || 'Unknown',
          status: mockMembership.status,
          joinedAt: mockMembership.joinedAt,
          lastAccessedAt: mockMembership.lastAccessedAt,
        },
        accessToken: mockToken,
      });
    });

    it('should throw ForbiddenException when user has no access to team', async () => {
      const userId = 'user-1';
      const tenantId = 'tenant-1';
      const switchDto: TeamSwitchDto = {
        teamId: 'team-1',
      };

      const mockTransaction = jest.fn().mockImplementation(async callback => {
        return await callback({
          save: jest.fn(),
        });
      });

      dataSource.transaction.mockImplementation(mockTransaction);
      teamRepository.findTeamMember.mockResolvedValue(null);

      await expect(
        service.switchTeam(userId, switchDto, tenantId)
      ).rejects.toThrow('You do not have access to this team');
    });

    it('should throw ForbiddenException when membership is not active', async () => {
      const userId = 'user-1';
      const tenantId = 'tenant-1';
      const switchDto: TeamSwitchDto = {
        teamId: 'team-1',
      };
      const inactiveMembership = {
        ...mockMembership,
        status: TeamStatus.INACTIVE,
      };

      const mockTransaction = jest.fn().mockImplementation(async callback => {
        return await callback({
          save: jest.fn(),
        });
      });

      dataSource.transaction.mockImplementation(mockTransaction);
      teamRepository.findTeamMember.mockResolvedValue(inactiveMembership);

      await expect(
        service.switchTeam(userId, switchDto, tenantId)
      ).rejects.toThrow('Your membership to this team is not active');
    });
  });

  describe('verifyTeamAccess', () => {
    it('should return true when user has access to team', async () => {
      const userId = 'user-1';
      const teamId = 'team-1';
      const tenantId = 'tenant-1';

      teamRepository.findTeamMember.mockResolvedValue(mockMembership);

      const result = await service.verifyTeamAccess(userId, teamId, tenantId);

      expect(teamRepository.findTeamMember).toHaveBeenCalledWith(
        teamId,
        userId,
        tenantId
      );
      expect(result).toBe(true);
    });

    it('should return false when user has no access to team', async () => {
      const userId = 'user-1';
      const teamId = 'team-1';
      const tenantId = 'tenant-1';

      teamRepository.findTeamMember.mockResolvedValue(null);

      const result = await service.verifyTeamAccess(userId, teamId, tenantId);

      expect(result).toBe(false);
    });

    it('should return false when membership is not active', async () => {
      const userId = 'user-1';
      const teamId = 'team-1';
      const tenantId = 'tenant-1';
      const inactiveMembership = {
        ...mockMembership,
        status: TeamStatus.INACTIVE,
      };

      teamRepository.findTeamMember.mockResolvedValue(inactiveMembership);

      const result = await service.verifyTeamAccess(userId, teamId, tenantId);

      expect(result).toBe(false);
    });
  });

  describe('getAvailableTeams', () => {
    it('should return available teams for switching', async () => {
      const userId = 'user-1';
      const tenantId = 'tenant-1';
      const mockResult = {
        teams: [
          {
            ...mockTeam,
            membership: mockMembership,
            memberCount: 5,
          },
        ],
        total: 1,
      };

      teamRepository.findUserTeamsWithMemberships.mockResolvedValue(mockResult);

      const result = await service.getAvailableTeams(userId, tenantId);

      expect(teamRepository.findUserTeamsWithMemberships).toHaveBeenCalledWith(
        userId,
        tenantId
      );
      expect(result).toEqual([
        {
          id: mockTeam.id,
          name: mockTeam.name,
          role: mockMembership.role?.name || 'Unknown',
        },
      ]);
    });

    it('should filter out inactive memberships', async () => {
      const userId = 'user-1';
      const tenantId = 'tenant-1';
      const inactiveMembership = {
        ...mockMembership,
        status: TeamStatus.INACTIVE,
      };
      const mockResult = {
        teams: [
          {
            ...mockTeam,
            membership: inactiveMembership,
            memberCount: 5,
          },
        ],
        total: 1,
      };

      teamRepository.findUserTeamsWithMemberships.mockResolvedValue(mockResult);

      const result = await service.getAvailableTeams(userId, tenantId);

      expect(result).toEqual([]);
    });
  });
});
