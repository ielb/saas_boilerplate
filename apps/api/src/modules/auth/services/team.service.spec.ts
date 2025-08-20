import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamRepository } from '../repositories/team.repository';
import { UserRepository } from '../repositories/user.repository';
import { RoleRepository } from '../repositories/role.repository';
import { EmailService } from './email.service';
import { AuditService } from './audit.service';
import {
  Team,
  TeamMembership,
  TeamInvitation,
  TeamStatus,
} from '../entities/team.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { AuditEventType } from '../entities/audit-log.entity';

describe('TeamService', () => {
  let service: TeamService;
  let teamRepository: jest.Mocked<TeamRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let roleRepository: jest.Mocked<RoleRepository>;
  let emailService: jest.Mocked<EmailService>;
  let auditService: jest.Mocked<AuditService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockTeamId = 'team-123';
  const mockRoleId = 'role-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockRole: Partial<Role> = {
    id: mockRoleId,
    name: 'Manager',
    description: 'Team Manager',
  };

  const mockTeam: Partial<Team> = {
    id: mockTeamId,
    name: 'Test Team',
    description: 'A test team',
    status: TeamStatus.ACTIVE,
    tenantId: mockTenantId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMembership: Partial<TeamMembership> = {
    id: 'membership-123',
    teamId: mockTeamId,
    userId: mockUserId,
    roleId: mockRoleId,
    status: TeamStatus.ACTIVE,
    tenantId: mockTenantId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockTeamRepository = {
      createTeam: jest.fn(),
      findTeamsWithDetails: jest.fn(),
      findTeamWithDetails: jest.fn(),
      findOneByIdForTenant: jest.fn(),
      updateTeam: jest.fn(),
      deleteWithTenantScope: jest.fn(),
      addTeamMember: jest.fn(),
      findTeamMembers: jest.fn(),
      findTeamMember: jest.fn(),
      updateTeamMember: jest.fn(),
      removeTeamMember: jest.fn(),
      createTeamInvitation: jest.fn(),
      findTeamInvitations: jest.fn(),
      findInvitationByToken: jest.fn(),
      findInvitationByEmail: jest.fn(),
      updateInvitationStatus: jest.fn(),
      findUserTeams: jest.fn(),
      getTeamAnalytics: jest.fn(),
      checkUserTeamMembership: jest.fn(),
      getUserTeamRole: jest.fn(),
      findInvitationById: jest.fn(),
      generateInvitationToken: jest.fn(),
      updateInvitationToken: jest.fn(),
      findExpiredInvitations: jest.fn(),
      getInvitationAnalytics: jest.fn(),
    };

    const mockUserRepository = {
      findOneByIdForTenant: jest.fn(),
      findByEmail: jest.fn(),
    };

    const mockRoleRepository = {
      findOneByIdForTenant: jest.fn(),
      findByName: jest.fn(),
    };

    const mockEmailService = {
      sendTeamInvitation: jest.fn(),
    };

    const mockAuditService = {
      logEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: TeamRepository,
          useValue: mockTeamRepository,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: RoleRepository,
          useValue: mockRoleRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
    teamRepository = module.get(TeamRepository);
    userRepository = module.get(UserRepository);
    roleRepository = module.get(RoleRepository);
    emailService = module.get(EmailService);
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTeam', () => {
    const createTeamDto = {
      name: 'Test Team',
      description: 'A test team',
    };

    it('should create a team successfully', async () => {
      const mockCreatedTeam = { ...mockTeam, ...createTeamDto };
      const mockManagerRole = { ...mockRole, name: 'Manager' };

      teamRepository.createTeam.mockResolvedValue(mockCreatedTeam as Team);
      roleRepository.findByName.mockResolvedValue(mockManagerRole as Role);
      teamRepository.addTeamMember.mockResolvedValue(
        mockMembership as TeamMembership
      );
      auditService.logEvent.mockResolvedValue(undefined as any);

      const result = await service.createTeam(
        createTeamDto,
        mockTenantId,
        mockUserId
      );

      expect(teamRepository.createTeam).toHaveBeenCalledWith(
        createTeamDto,
        mockTenantId
      );
      expect(roleRepository.findByName).toHaveBeenCalledWith('Manager');
      expect(teamRepository.addTeamMember).toHaveBeenCalledWith(
        {
          teamId: mockTeamId,
          userId: mockUserId,
          roleId: mockRoleId,
          invitedById: mockUserId,
        },
        mockTenantId
      );
      expect(auditService.logEvent).toHaveBeenCalledWith({
        eventType: 'team_created',
        userId: mockUserId,
        tenantId: mockTenantId,
        description: `Team "${createTeamDto.name}" created`,
        metadata: { teamName: createTeamDto.name, teamId: mockTeamId },
      });
      expect(result).toEqual(expect.objectContaining(createTeamDto));
    });

    it('should validate manager exists if provided', async () => {
      const createTeamDtoWithManager = {
        ...createTeamDto,
        managerId: 'manager-123',
      };

      userRepository.findOneByIdForTenant.mockResolvedValue(null);

      await expect(
        service.createTeam(createTeamDtoWithManager, mockTenantId, mockUserId)
      ).rejects.toThrow(NotFoundException);

      expect(userRepository.findOneByIdForTenant).toHaveBeenCalledWith(
        'manager-123'
      );
    });
  });

  describe('findTeams', () => {
    const query = { page: 1, limit: 10 };

    it('should return teams with pagination', async () => {
      const mockTeams = [mockTeam];
      const mockResult = { teams: mockTeams, total: 1 };

      teamRepository.findTeamsWithDetails.mockResolvedValue(mockResult as any);

      const result = await service.findTeams(query, mockTenantId);

      expect(teamRepository.findTeamsWithDetails).toHaveBeenCalledWith(
        mockTenantId,
        query
      );
      expect(result).toEqual({
        teams: expect.arrayContaining([
          expect.objectContaining({
            id: mockTeam.id,
            name: mockTeam.name,
            description: mockTeam.description,
            status: mockTeam.status,
          }),
        ]),
        total: 1,
      });
    });
  });

  describe('findTeam', () => {
    it('should return team by ID', async () => {
      teamRepository.findTeamWithDetails.mockResolvedValue(mockTeam as Team);

      const result = await service.findTeam(mockTeamId, mockTenantId);

      expect(teamRepository.findTeamWithDetails).toHaveBeenCalledWith(
        mockTeamId,
        mockTenantId
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: mockTeam.id,
          name: mockTeam.name,
          description: mockTeam.description,
          status: mockTeam.status,
        })
      );
    });

    it('should throw NotFoundException if team not found', async () => {
      teamRepository.findTeamWithDetails.mockResolvedValue(null);

      await expect(service.findTeam(mockTeamId, mockTenantId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateTeam', () => {
    const updateTeamDto = { name: 'Updated Team' };

    it('should update team successfully', async () => {
      const updatedTeam = { ...mockTeam, ...updateTeamDto };

      teamRepository.findOneByIdForTenant.mockResolvedValue(mockTeam as Team);
      teamRepository.updateTeam.mockResolvedValue(updatedTeam as Team);
      auditService.logEvent.mockResolvedValue(undefined as any);

      const result = await service.updateTeam(
        mockTeamId,
        updateTeamDto,
        mockTenantId,
        mockUserId
      );

      expect(teamRepository.findOneByIdForTenant).toHaveBeenCalledWith(
        mockTeamId
      );
      expect(teamRepository.updateTeam).toHaveBeenCalledWith(
        mockTeamId,
        updateTeamDto,
        mockTenantId
      );
      expect(auditService.logEvent).toHaveBeenCalledWith({
        eventType: 'team_updated',
        userId: mockUserId,
        tenantId: mockTenantId,
        description: `Team "${updatedTeam.name}" updated`,
        metadata: {
          teamName: updatedTeam.name,
          teamId: mockTeamId,
          changes: updateTeamDto,
        },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: mockTeam.id,
          name: 'Updated Team',
          description: mockTeam.description,
          status: mockTeam.status,
        })
      );
    });

    it('should throw NotFoundException if team not found', async () => {
      teamRepository.findOneByIdForTenant.mockResolvedValue(null);

      await expect(
        service.updateTeam(mockTeamId, updateTeamDto, mockTenantId, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTeam', () => {
    it('should delete team successfully', async () => {
      teamRepository.findOneByIdForTenant.mockResolvedValue(mockTeam as Team);
      teamRepository.deleteWithTenantScope.mockResolvedValue(undefined as any);
      auditService.logEvent.mockResolvedValue(undefined as any);

      await service.deleteTeam(mockTeamId, mockTenantId, mockUserId);

      expect(teamRepository.findOneByIdForTenant).toHaveBeenCalledWith(
        mockTeamId
      );
      expect(teamRepository.deleteWithTenantScope).toHaveBeenCalledWith({
        id: mockTeamId,
      });
      expect(auditService.logEvent).toHaveBeenCalledWith({
        eventType: 'team_deleted',
        userId: mockUserId,
        tenantId: mockTenantId,
        description: `Team "${mockTeam.name}" deleted`,
        metadata: { teamName: mockTeam.name, teamId: mockTeamId },
      });
    });

    it('should throw NotFoundException if team not found', async () => {
      teamRepository.findOneByIdForTenant.mockResolvedValue(null);

      await expect(
        service.deleteTeam(mockTeamId, mockTenantId, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addTeamMember', () => {
    const addMemberDto = {
      userId: 'new-user-123',
      roleId: mockRoleId,
    };

    it('should add team member successfully', async () => {
      const mockNewUser = { ...mockUser, id: 'new-user-123' };

      teamRepository.findOneByIdForTenant.mockResolvedValue(mockTeam as Team);
      userRepository.findOneByIdForTenant.mockResolvedValue(
        mockNewUser as User
      );
      roleRepository.findOneByIdForTenant.mockResolvedValue(mockRole as Role);
      teamRepository.findTeamMember.mockResolvedValue(null);
      teamRepository.addTeamMember.mockResolvedValue(
        mockMembership as TeamMembership
      );
      auditService.logEvent.mockResolvedValue({} as any);

      const result = await service.addTeamMember(
        mockTeamId,
        addMemberDto,
        mockTenantId,
        mockUserId
      );

      expect(teamRepository.findOneByIdForTenant).toHaveBeenCalledWith(
        mockTeamId
      );
      expect(userRepository.findOneByIdForTenant).toHaveBeenCalledWith(
        addMemberDto.userId
      );
      expect(roleRepository.findOneByIdForTenant).toHaveBeenCalledWith(
        addMemberDto.roleId
      );
      expect(teamRepository.addTeamMember).toHaveBeenCalledWith(
        {
          teamId: mockTeamId,
          userId: addMemberDto.userId,
          roleId: addMemberDto.roleId,
          invitedById: mockUserId,
        },
        mockTenantId
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: mockMembership.id,
          teamId: mockMembership.teamId,
          userId: mockMembership.userId,
          roleId: mockMembership.roleId,
          status: mockMembership.status,
        })
      );
    });

    it('should throw BadRequestException if user is already a member', async () => {
      teamRepository.findOneByIdForTenant.mockResolvedValue(mockTeam as Team);
      userRepository.findOneByIdForTenant.mockResolvedValue(mockUser as User);
      roleRepository.findOneByIdForTenant.mockResolvedValue(mockRole as Role);
      teamRepository.findTeamMember.mockResolvedValue(
        mockMembership as TeamMembership
      );

      await expect(
        service.addTeamMember(
          mockTeamId,
          addMemberDto,
          mockTenantId,
          mockUserId
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findTeamMembers', () => {
    const query = { page: 1, limit: 10 };

    it('should return team members with pagination', async () => {
      const mockResult = { members: [mockMembership], total: 1 };

      teamRepository.findTeamMembers.mockResolvedValue(mockResult as any);

      const result = await service.findTeamMembers(
        mockTeamId,
        query,
        mockTenantId
      );

      expect(teamRepository.findTeamMembers).toHaveBeenCalledWith(
        mockTeamId,
        mockTenantId,
        query
      );
      expect(result).toEqual({
        members: expect.arrayContaining([
          expect.objectContaining({
            id: mockMembership.id,
            teamId: mockMembership.teamId,
            userId: mockMembership.userId,
            roleId: mockMembership.roleId,
            status: mockMembership.status,
          }),
        ]),
        total: 1,
      });
    });
  });

  describe('updateTeamMember', () => {
    const updateMemberDto = { roleId: 'new-role-123' };
    const memberId = 'membership-123';

    it('should update team member successfully', async () => {
      const updatedMembership = { ...mockMembership, roleId: 'new-role-123' };

      teamRepository.findOneByIdForTenant.mockResolvedValue(mockTeam as Team);
      roleRepository.findOneByIdForTenant.mockResolvedValue(mockRole as Role);
      teamRepository.updateTeamMember.mockResolvedValue(
        updatedMembership as TeamMembership
      );
      auditService.logEvent.mockResolvedValue(undefined as any);

      const result = await service.updateTeamMember(
        mockTeamId,
        memberId,
        updateMemberDto,
        mockTenantId,
        mockUserId
      );

      expect(teamRepository.findOneByIdForTenant).toHaveBeenCalledWith(
        mockTeamId
      );
      expect(roleRepository.findOneByIdForTenant).toHaveBeenCalledWith(
        updateMemberDto.roleId
      );
      expect(teamRepository.updateTeamMember).toHaveBeenCalledWith(
        memberId,
        updateMemberDto,
        mockTenantId
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: mockMembership.id,
          teamId: mockMembership.teamId,
          userId: mockMembership.userId,
          roleId: 'new-role-123',
          status: mockMembership.status,
        })
      );
    });

    it('should throw NotFoundException if team member not found', async () => {
      teamRepository.findOneByIdForTenant.mockResolvedValue(mockTeam as Team);
      roleRepository.findOneByIdForTenant.mockResolvedValue(mockRole as Role);
      teamRepository.updateTeamMember.mockResolvedValue(null);

      await expect(
        service.updateTeamMember(
          mockTeamId,
          memberId,
          updateMemberDto,
          mockTenantId,
          mockUserId
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeTeamMember', () => {
    const userIdToRemove = 'user-to-remove-123';

    it('should remove team member successfully', async () => {
      const mockMemberToRemove = { ...mockMembership, userId: userIdToRemove };

      teamRepository.findOneByIdForTenant.mockResolvedValue(mockTeam as Team);
      teamRepository.findTeamMember.mockResolvedValue(
        mockMemberToRemove as TeamMembership
      );
      teamRepository.removeTeamMember.mockResolvedValue(true);
      auditService.logEvent.mockResolvedValue(undefined as any);

      await service.removeTeamMember(
        mockTeamId,
        userIdToRemove,
        mockTenantId,
        mockUserId
      );

      expect(teamRepository.findOneByIdForTenant).toHaveBeenCalledWith(
        mockTeamId
      );
      expect(teamRepository.findTeamMember).toHaveBeenCalledWith(
        mockTeamId,
        userIdToRemove,
        mockTenantId
      );
      expect(teamRepository.removeTeamMember).toHaveBeenCalledWith(
        mockTeamId,
        userIdToRemove,
        mockTenantId
      );
    });

    it('should throw NotFoundException if team member not found', async () => {
      teamRepository.findOneByIdForTenant.mockResolvedValue(mockTeam as Team);
      teamRepository.findTeamMember.mockResolvedValue(null);

      await expect(
        service.removeTeamMember(
          mockTeamId,
          userIdToRemove,
          mockTenantId,
          mockUserId
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('inviteTeamMember', () => {
    const inviteDto = {
      email: 'invite@example.com',
      roleId: mockRoleId,
      message: 'Welcome to the team!',
    };

    it('should invite team member successfully', async () => {
      const mockInvitation: Partial<TeamInvitation> = {
        id: 'invitation-123',
        teamId: mockTeamId,
        email: inviteDto.email,
        roleId: mockRoleId,
        invitedById: mockUserId,
        token: 'invitation-token',
        status: 'pending',
        expiresAt: new Date(),
        tenantId: mockTenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
        invitedBy: {
          id: mockUserId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        } as User,
        role: mockRole as Role,
      };

      teamRepository.findOneByIdForTenant.mockResolvedValue(mockTeam as Team);
      roleRepository.findOneByIdForTenant.mockResolvedValue(mockRole as Role);
      userRepository.findByEmail.mockResolvedValue(null);
      teamRepository.findInvitationByEmail.mockResolvedValue(null);
      teamRepository.createTeamInvitation.mockResolvedValue(
        mockInvitation as TeamInvitation
      );
      emailService.sendTeamInvitation.mockResolvedValue(undefined);
      auditService.logEvent.mockResolvedValue(undefined as any);

      const result = await service.inviteTeamMember(
        mockTeamId,
        inviteDto,
        mockTenantId,
        mockUserId
      );

      expect(teamRepository.findOneByIdForTenant).toHaveBeenCalledWith(
        mockTeamId
      );
      expect(roleRepository.findOneByIdForTenant).toHaveBeenCalledWith(
        inviteDto.roleId
      );
      expect(teamRepository.createTeamInvitation).toHaveBeenCalledWith(
        {
          teamId: mockTeamId,
          email: inviteDto.email,
          roleId: inviteDto.roleId,
          invitedById: mockUserId,
        },
        mockTenantId
      );
      expect(emailService.sendTeamInvitation).toHaveBeenCalledWith({
        to: inviteDto.email,
        teamName: mockTeam.name,
        inviterName: 'John Doe',
        roleName: mockRole.name,
        invitationToken: mockInvitation.token,
        message: inviteDto.message,
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: mockInvitation.id,
          teamId: mockInvitation.teamId,
          email: mockInvitation.email,
          roleId: mockInvitation.roleId,
          status: mockInvitation.status,
          expiresAt: mockInvitation.expiresAt,
        })
      );
    });

    it('should throw BadRequestException if invitation already exists', async () => {
      const existingInvitation: Partial<TeamInvitation> = {
        status: 'pending',
      };

      teamRepository.findOneByIdForTenant.mockResolvedValue(mockTeam as Team);
      roleRepository.findOneByIdForTenant.mockResolvedValue(mockRole as Role);
      userRepository.findByEmail.mockResolvedValue(null);
      teamRepository.findInvitationByEmail.mockResolvedValue(
        existingInvitation as TeamInvitation
      );

      await expect(
        service.inviteTeamMember(
          mockTeamId,
          inviteDto,
          mockTenantId,
          mockUserId
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findTeamInvitations', () => {
    const query = { page: 1, limit: 10 };

    it('should return team invitations with pagination', async () => {
      const mockInvitations = [
        {
          id: 'invitation-123',
          teamId: mockTeamId,
          email: 'invite@example.com',
          status: 'pending',
        },
      ];
      const mockResult = { invitations: mockInvitations, total: 1 };

      teamRepository.findTeamInvitations.mockResolvedValue(mockResult as any);

      const result = await service.findTeamInvitations(
        mockTeamId,
        query,
        mockTenantId
      );

      expect(teamRepository.findTeamInvitations).toHaveBeenCalledWith(
        mockTeamId,
        mockTenantId,
        query
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('acceptTeamInvitation', () => {
    const token = 'valid-token';

    it('should accept team invitation successfully', async () => {
      const mockInvitation: Partial<TeamInvitation> = {
        id: 'invitation-123',
        teamId: mockTeamId,
        email: 'invite@example.com',
        roleId: mockRoleId,
        invitedById: mockUserId,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        tenantId: mockTenantId,
      };

      teamRepository.findInvitationByToken.mockResolvedValue(
        mockInvitation as TeamInvitation
      );
      userRepository.findOneByIdForTenant.mockResolvedValue(mockUser as User);
      teamRepository.findTeamMember.mockResolvedValue(null);
      teamRepository.addTeamMember.mockResolvedValue(
        mockMembership as TeamMembership
      );
      teamRepository.updateInvitationStatus.mockResolvedValue(
        mockInvitation as TeamInvitation
      );
      auditService.logEvent.mockResolvedValue(undefined as any);

      const result = await service.acceptTeamInvitation(
        token,
        mockTenantId,
        mockUserId
      );

      expect(teamRepository.findInvitationByToken).toHaveBeenCalledWith(
        token,
        mockTenantId
      );
      expect(teamRepository.addTeamMember).toHaveBeenCalledWith(
        {
          teamId: mockTeamId,
          userId: mockUserId,
          roleId: mockRoleId,
          invitedById: mockUserId,
        },
        mockTenantId
      );
      expect(teamRepository.updateInvitationStatus).toHaveBeenCalledWith(
        mockInvitation.id,
        'accepted',
        mockTenantId
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: mockMembership.id,
          teamId: mockMembership.teamId,
          userId: mockMembership.userId,
          roleId: mockMembership.roleId,
          status: mockMembership.status,
        })
      );
    });

    it('should throw NotFoundException for invalid token', async () => {
      teamRepository.findInvitationByToken.mockResolvedValue(null);

      await expect(
        service.acceptTeamInvitation(token, mockTenantId, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for expired invitation', async () => {
      const expiredInvitation: Partial<TeamInvitation> = {
        status: 'pending',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      };

      teamRepository.findInvitationByToken.mockResolvedValue(
        expiredInvitation as TeamInvitation
      );

      await expect(
        service.acceptTeamInvitation(token, mockTenantId, mockUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findUserTeams', () => {
    it('should return user teams', async () => {
      const mockTeams = [mockTeam];

      teamRepository.findUserTeams.mockResolvedValue(mockTeams as Team[]);

      const result = await service.findUserTeams(mockUserId, mockTenantId);

      expect(teamRepository.findUserTeams).toHaveBeenCalledWith(
        mockUserId,
        mockTenantId
      );
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: mockTeam.id,
            name: mockTeam.name,
            description: mockTeam.description,
            status: mockTeam.status,
          }),
        ])
      );
    });
  });

  describe('getTeamAnalytics', () => {
    it('should return team analytics', async () => {
      const mockAnalytics = {
        teamId: mockTeamId,
        totalMembers: 5,
        activeMembers: 4,
        membersByRole: { Manager: 1, Member: 3 },
        recentActivityCount: 10,
        createdAt: new Date(),
      };

      teamRepository.findOneByIdForTenant.mockResolvedValue(mockTeam as Team);
      teamRepository.getTeamAnalytics.mockResolvedValue(mockAnalytics);

      const result = await service.getTeamAnalytics(mockTeamId, mockTenantId);

      expect(teamRepository.findOneByIdForTenant).toHaveBeenCalledWith(
        mockTeamId
      );
      expect(teamRepository.getTeamAnalytics).toHaveBeenCalledWith(
        mockTeamId,
        mockTenantId
      );
      expect(result).toEqual(mockAnalytics);
    });

    it('should throw NotFoundException if team not found', async () => {
      teamRepository.findOneByIdForTenant.mockResolvedValue(null);

      await expect(
        service.getTeamAnalytics(mockTeamId, mockTenantId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkUserTeamMembership', () => {
    it('should return true if user is team member', async () => {
      teamRepository.checkUserTeamMembership.mockResolvedValue(true);

      const result = await service.checkUserTeamMembership(
        mockUserId,
        mockTeamId,
        mockTenantId
      );

      expect(teamRepository.checkUserTeamMembership).toHaveBeenCalledWith(
        mockUserId,
        mockTeamId,
        mockTenantId
      );
      expect(result).toBe(true);
    });

    it('should return false if user is not team member', async () => {
      teamRepository.checkUserTeamMembership.mockResolvedValue(false);

      const result = await service.checkUserTeamMembership(
        mockUserId,
        mockTeamId,
        mockTenantId
      );

      expect(result).toBe(false);
    });
  });

  describe('getUserTeamRole', () => {
    it('should return user team role', async () => {
      const mockMembership = {
        id: 'membership-123',
        role: mockRole,
      };

      teamRepository.getUserTeamRole.mockResolvedValue(mockRole as Role);

      const result = await service.getUserTeamRole(
        mockUserId,
        mockTeamId,
        mockTenantId
      );

      expect(teamRepository.getUserTeamRole).toHaveBeenCalledWith(
        mockUserId,
        mockTeamId,
        mockTenantId
      );
      expect(result).toEqual(mockRole);
    });

    it('should return null if user has no role', async () => {
      teamRepository.getUserTeamRole.mockResolvedValue(null);

      const result = await service.getUserTeamRole(
        mockUserId,
        mockTeamId,
        mockTenantId
      );

      expect(result).toBeNull();
    });
  });

  describe('resendTeamInvitation', () => {
    const invitationId = 'invitation-123';

    it('should resend team invitation successfully', async () => {
      const mockInvitation: Partial<TeamInvitation> = {
        id: invitationId,
        teamId: mockTeamId,
        email: 'invite@example.com',
        roleId: mockRoleId,
        invitedById: mockUserId,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        tenantId: mockTenantId,
        team: mockTeam as Team,
        role: mockRole as Role,
        invitedBy: mockUser as User,
      };

      const updatedInvitation = {
        ...mockInvitation,
        token: 'new-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      teamRepository.findInvitationById.mockResolvedValue(
        mockInvitation as TeamInvitation
      );
      teamRepository.generateInvitationToken.mockReturnValue('new-token');
      teamRepository.updateInvitationToken.mockResolvedValue(
        updatedInvitation as TeamInvitation
      );
      emailService.sendTeamInvitation.mockResolvedValue(undefined);
      auditService.logEvent.mockResolvedValue(undefined as any);

      const result = await service.resendTeamInvitation(
        invitationId,
        mockTenantId,
        mockUserId
      );

      expect(teamRepository.findInvitationById).toHaveBeenCalledWith(
        invitationId,
        mockTenantId
      );
      expect(teamRepository.updateInvitationToken).toHaveBeenCalledWith(
        invitationId,
        'new-token',
        expect.any(Date),
        mockTenantId
      );
      expect(emailService.sendTeamInvitation).toHaveBeenCalledWith({
        to: 'invite@example.com',
        teamName: 'Test Team',
        inviterName: 'Test User',
        roleName: 'Manager',
        invitationToken: 'new-token',
        message: 'Your invitation has been resent',
      });
      expect(auditService.logEvent).toHaveBeenCalledWith({
        eventType: AuditEventType.TEAM_INVITATION_RESENT,
        userId: mockUserId,
        tenantId: mockTenantId,
        description: 'Team invitation resent',
        metadata: {
          teamId: mockTeamId,
          teamName: 'Test Team',
          invitedEmail: 'invite@example.com',
          invitationId: invitationId,
        },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: invitationId,
          email: 'invite@example.com',
          status: 'pending',
        })
      );
    });

    it('should throw NotFoundException if invitation not found', async () => {
      teamRepository.findInvitationById.mockResolvedValue(null);

      await expect(
        service.resendTeamInvitation(invitationId, mockTenantId, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invitation is not pending', async () => {
      const mockInvitation = {
        id: invitationId,
        status: 'accepted',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      teamRepository.findInvitationById.mockResolvedValue(
        mockInvitation as TeamInvitation
      );

      await expect(
        service.resendTeamInvitation(invitationId, mockTenantId, mockUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if invitation has expired', async () => {
      const mockInvitation = {
        id: invitationId,
        status: 'pending',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired 24 hours ago
      };

      teamRepository.findInvitationById.mockResolvedValue(
        mockInvitation as TeamInvitation
      );

      await expect(
        service.resendTeamInvitation(invitationId, mockTenantId, mockUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkInviteTeamMembers', () => {
    const bulkInviteDto = {
      invitations: [
        {
          email: 'user1@example.com',
          roleId: mockRoleId,
          message: 'Welcome to the team!',
        },
        {
          email: 'user2@example.com',
          roleId: mockRoleId,
        },
      ],
    };

    it('should process bulk invitations successfully', async () => {
      const mockInvitation1 = {
        id: 'invitation-1',
        teamId: mockTeamId,
        email: 'user1@example.com',
        roleId: mockRoleId,
        invitedById: mockUserId,
        token: 'token-1',
        status: 'pending',
        expiresAt: new Date(),
        tenantId: mockTenantId,
        invitedBy: mockUser as User,
        role: mockRole as Role,
      };

      const mockInvitation2 = {
        id: 'invitation-2',
        teamId: mockTeamId,
        email: 'user2@example.com',
        roleId: mockRoleId,
        invitedById: mockUserId,
        token: 'token-2',
        status: 'pending',
        expiresAt: new Date(),
        tenantId: mockTenantId,
        invitedBy: mockUser as User,
        role: mockRole as Role,
      };

      teamRepository.findOneByIdForTenant.mockResolvedValue(mockTeam as Team);
      roleRepository.findOneByIdForTenant
        .mockResolvedValueOnce(mockRole as Role)
        .mockResolvedValueOnce(null); // Role not found for second invitation
      userRepository.findByEmail.mockResolvedValue(null);
      teamRepository.findInvitationByEmail.mockResolvedValue(null);
      teamRepository.createTeamInvitation.mockResolvedValue({
        id: 'invitation-1',
        teamId: mockTeamId,
        email: 'user1@example.com',
        roleId: mockRoleId,
        invitedById: mockUserId,
        token: 'token-1',
        status: 'pending',
        expiresAt: new Date(),
        tenantId: mockTenantId,
        invitedBy: mockUser as User,
        role: mockRole as Role,
      } as TeamInvitation);
      emailService.sendTeamInvitation.mockResolvedValue(undefined);
      auditService.logEvent.mockResolvedValue(undefined as any);

      const result = await service.bulkInviteTeamMembers(
        mockTeamId,
        bulkInviteDto,
        mockTenantId,
        mockUserId
      );

      expect(result.totalInvitations).toBe(2);
      expect(result.successfulInvitations).toBe(1);
      expect(result.failedInvitations).toBe(1);
      expect(result.results[0]?.success).toBe(true);
      expect(result.results[1]?.success).toBe(false);
      expect(result.results[1]?.error).toBe('Role not found');
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should cleanup expired invitations successfully', async () => {
      const expiredInvitations = [
        {
          id: 'invitation-1',
          teamId: mockTeamId,
          email: 'user1@example.com',
          invitedById: mockUserId,
          team: mockTeam as Team,
        },
        {
          id: 'invitation-2',
          teamId: mockTeamId,
          email: 'user2@example.com',
          invitedById: mockUserId,
          team: mockTeam as Team,
        },
      ];

      teamRepository.findExpiredInvitations.mockResolvedValue(
        expiredInvitations as TeamInvitation[]
      );
      teamRepository.updateInvitationStatus.mockResolvedValue(
        {} as TeamInvitation
      );
      auditService.logEvent.mockResolvedValue(undefined as any);

      const result = await service.cleanupExpiredInvitations(mockTenantId);

      expect(teamRepository.findExpiredInvitations).toHaveBeenCalledWith(
        mockTenantId
      );
      expect(teamRepository.updateInvitationStatus).toHaveBeenCalledTimes(2);
      expect(auditService.logEvent).toHaveBeenCalledTimes(2);
      expect(result).toBe(2);
    });

    it('should return 0 when no expired invitations found', async () => {
      teamRepository.findExpiredInvitations.mockResolvedValue([]);

      const result = await service.cleanupExpiredInvitations(mockTenantId);

      expect(result).toBe(0);
      expect(teamRepository.updateInvitationStatus).not.toHaveBeenCalled();
      expect(auditService.logEvent).not.toHaveBeenCalled();
    });
  });

  describe('getInvitationAnalytics', () => {
    it('should return invitation analytics successfully', async () => {
      const mockAnalytics = {
        total: 10,
        pending: 3,
        accepted: 5,
        expired: 1,
        cancelled: 1,
        averageResponseTime: 24.5,
        byRole: { Member: 8, Admin: 2 },
        byDay: { '2024-01-01': 3, '2024-01-02': 7 },
      };

      teamRepository.getInvitationAnalytics.mockResolvedValue(mockAnalytics);

      const result = await service.getInvitationAnalytics(
        mockTeamId,
        mockTenantId,
        30
      );

      expect(teamRepository.getInvitationAnalytics).toHaveBeenCalledWith(
        mockTeamId,
        mockTenantId,
        expect.any(Date)
      );
      expect(result.teamId).toBe(mockTeamId);
      expect(result.period).toBe('30 days');
      expect(result.totalInvitations).toBe(10);
      expect(result.pendingInvitations).toBe(3);
      expect(result.acceptedInvitations).toBe(5);
      expect(result.expiredInvitations).toBe(1);
      expect(result.cancelledInvitations).toBe(1);
      expect(result.acceptanceRate).toBe(50); // 5/10 * 100
      expect(result.averageResponseTime).toBe(24.5);
      expect(result.invitationsByRole).toEqual({ Member: 8, Admin: 2 });
      expect(result.invitationsByDay).toEqual({
        '2024-01-01': 3,
        '2024-01-02': 7,
      });
    });

    it('should handle analytics with no invitations', async () => {
      const mockAnalytics = {
        total: 0,
        pending: 0,
        accepted: 0,
        expired: 0,
        cancelled: 0,
        byRole: {} as Record<string, number>,
        byDay: {} as Record<string, number>,
      };

      teamRepository.getInvitationAnalytics.mockResolvedValue(mockAnalytics);

      const result = await service.getInvitationAnalytics(
        mockTeamId,
        mockTenantId,
        30
      );

      expect(result.acceptanceRate).toBe(0);
      expect(result.averageResponseTime).toBeUndefined();
    });
  });
});
