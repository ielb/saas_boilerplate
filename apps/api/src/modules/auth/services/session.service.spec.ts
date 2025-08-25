import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { SessionService } from './session.service';
import { Session, SessionStatus, DeviceType } from '../entities/session.entity';
import { User } from '../../users/entities/user.entity';
import { JwtService } from './jwt.service';
import { RefreshTokenService } from './refresh-token.service';
import {
  CreateSessionDto,
  UpdateSessionDto,
  RevokeSessionDto,
} from '../dto/session.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepository: Repository<Session>;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let refreshTokenService: RefreshTokenService;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockSession: Partial<Session> = {
    id: 'session-123',
    userId: 'user-123',
    deviceFingerprint: 'fingerprint-123',
    deviceName: 'Test Device',
    deviceType: DeviceType.DESKTOP,
    browser: 'Chrome',
    browserVersion: '91.0',
    operatingSystem: 'Windows',
    osVersion: '10.0',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    location: 'New York, NY',
    timezone: 'America/New_York',
    status: SessionStatus.ACTIVE,
    isTrusted: false,
    isRememberMe: false,
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: () => true,
    isExpired: () => false,
    revoke: jest.fn(),
    markAsSuspicious: jest.fn(),
    updateActivity: jest.fn(),
    extendExpiration: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(Session),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            generateAccessToken: jest.fn(),
            validateToken: jest.fn(),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            revokeRefreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionRepository = module.get<Repository<Session>>(
      getRepositoryToken(Session)
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    const createSessionDto: CreateSessionDto = {
      userId: 'user-123',
      deviceFingerprint: 'fingerprint-123',
      deviceName: 'Test Device',
      deviceType: DeviceType.DESKTOP,
      browser: 'Chrome',
      browserVersion: '91.0',
      operatingSystem: 'Windows',
      osVersion: '10.0',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      location: 'New York, NY',
      timezone: 'America/New_York',
      isRememberMe: false,
    };

    it('should create a new session successfully', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(sessionRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(sessionRepository, 'create')
        .mockReturnValue(mockSession as Session);
      jest
        .spyOn(sessionRepository, 'save')
        .mockResolvedValue(mockSession as Session);
      jest.spyOn(sessionRepository, 'find').mockResolvedValue([]);

      // Act
      const result = await service.createSession(createSessionDto);

      // Assert
      expect(result).toEqual(mockSession);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          deviceFingerprint: 'fingerprint-123',
          deviceName: 'Test Device',
          deviceType: DeviceType.DESKTOP,
        })
      );
      expect(sessionRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.createSession(createSessionDto)).rejects.toThrow(
        NotFoundException
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should update existing session if device fingerprint matches', async () => {
      // Arrange
      const existingSession = { ...mockSession, updateActivity: jest.fn() };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(existingSession as Session);
      jest
        .spyOn(sessionRepository, 'save')
        .mockResolvedValue(existingSession as Session);

      // Act
      const result = await service.createSession(createSessionDto);

      // Assert
      expect(result).toEqual(existingSession);
      expect(existingSession.updateActivity).toHaveBeenCalled();
      expect(sessionRepository.save).toHaveBeenCalledWith(existingSession);
    });
  });

  describe('getUserSessions', () => {
    it('should return all sessions for a user', async () => {
      // Arrange
      const sessions = [mockSession, { ...mockSession, id: 'session-456' }];
      jest
        .spyOn(sessionRepository, 'find')
        .mockResolvedValue(sessions as Session[]);

      // Act
      const result = await service.getUserSessions('user-123');

      // Assert
      expect(result).toEqual(sessions);
      expect(sessionRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { lastActivityAt: 'DESC' },
      });
    });
  });

  describe('getActiveSessions', () => {
    it('should return only active sessions for a user', async () => {
      // Arrange
      const activeSessions = [mockSession];
      jest
        .spyOn(sessionRepository, 'find')
        .mockResolvedValue(activeSessions as Session[]);

      // Act
      const result = await service.getActiveSessions('user-123');

      // Assert
      expect(result).toEqual(activeSessions);
      expect(sessionRepository.find).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          status: SessionStatus.ACTIVE,
          expiresAt: expect.any(Object), // MoreThan(new Date())
        },
        order: { lastActivityAt: 'DESC' },
      });
    });
  });

  describe('getSession', () => {
    it('should return a session by ID', async () => {
      // Arrange
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(mockSession as Session);

      // Act
      const result = await service.getSession('session-123');

      // Assert
      expect(result).toEqual(mockSession);
      expect(sessionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        relations: ['user'],
      });
    });

    it('should throw NotFoundException when session does not exist', async () => {
      // Arrange
      jest.spyOn(sessionRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getSession('session-123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateSession', () => {
    const updateSessionDto: UpdateSessionDto = {
      deviceName: 'Updated Device Name',
      isTrusted: true,
    };

    it('should update session successfully', async () => {
      // Arrange
      const sessionToUpdate = { ...mockSession, updateActivity: jest.fn() };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(sessionToUpdate as Session);
      jest
        .spyOn(sessionRepository, 'save')
        .mockResolvedValue(sessionToUpdate as Session);

      // Act
      const result = await service.updateSession(
        'session-123',
        updateSessionDto
      );

      // Assert
      expect(result).toEqual(sessionToUpdate);
      expect(sessionToUpdate.updateActivity).toHaveBeenCalled();
      expect(sessionRepository.save).toHaveBeenCalledWith(sessionToUpdate);
    });
  });

  describe('revokeSession', () => {
    const revokeSessionDto: RevokeSessionDto = {
      reason: 'Security concern',
    };

    it('should revoke session successfully', async () => {
      // Arrange
      const sessionToRevoke = { ...mockSession, revoke: jest.fn() };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(sessionToRevoke as Session);
      jest
        .spyOn(sessionRepository, 'save')
        .mockResolvedValue(sessionToRevoke as Session);

      // Act
      await service.revokeSession('session-123', revokeSessionDto);

      // Assert
      expect(sessionToRevoke.revoke).toHaveBeenCalledWith('Security concern');
      expect(sessionRepository.save).toHaveBeenCalledWith(sessionToRevoke);
    });

    it('should revoke session without reason', async () => {
      // Arrange
      const sessionToRevoke = { ...mockSession, revoke: jest.fn() };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(sessionToRevoke as Session);
      jest
        .spyOn(sessionRepository, 'save')
        .mockResolvedValue(sessionToRevoke as Session);

      // Act
      await service.revokeSession('session-123');

      // Assert
      expect(sessionToRevoke.revoke).toHaveBeenCalledWith(undefined);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all active sessions for a user', async () => {
      // Arrange
      const activeSessions = [
        { ...mockSession, id: 'session-1' },
        { ...mockSession, id: 'session-2' },
      ];
      jest
        .spyOn(sessionRepository, 'find')
        .mockResolvedValue(activeSessions as Session[]);
      jest.spyOn(service, 'revokeSession').mockResolvedValue();

      // Act
      await service.revokeAllUserSessions('user-123', 'Logout all devices');

      // Assert
      expect(service.revokeSession).toHaveBeenCalledTimes(2);
      expect(service.revokeSession).toHaveBeenCalledWith('session-1', {
        reason: 'Logout all devices',
      });
      expect(service.revokeSession).toHaveBeenCalledWith('session-2', {
        reason: 'Logout all devices',
      });
    });
  });

  describe('revokeOtherSessions', () => {
    it('should revoke all sessions except the current one', async () => {
      // Arrange
      const activeSessions = [
        { ...mockSession, id: 'session-1' },
        { ...mockSession, id: 'session-2' },
        { ...mockSession, id: 'current-session' },
      ];
      jest
        .spyOn(sessionRepository, 'find')
        .mockResolvedValue(activeSessions as Session[]);
      jest.spyOn(service, 'revokeSession').mockResolvedValue();

      // Act
      await service.revokeOtherSessions(
        'user-123',
        'current-session',
        'Security concern'
      );

      // Assert
      expect(service.revokeSession).toHaveBeenCalledTimes(2);
      expect(service.revokeSession).toHaveBeenCalledWith('session-1', {
        reason: 'Security concern',
      });
      expect(service.revokeSession).toHaveBeenCalledWith('session-2', {
        reason: 'Security concern',
      });
      expect(service.revokeSession).not.toHaveBeenCalledWith(
        'current-session',
        expect.anything()
      );
    });
  });

  describe('markDeviceAsTrusted', () => {
    it('should mark device as trusted', async () => {
      // Arrange
      const sessionToUpdate = { ...mockSession, isTrusted: false };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(sessionToUpdate as Session);
      jest
        .spyOn(sessionRepository, 'save')
        .mockResolvedValue({ ...sessionToUpdate, isTrusted: true } as Session);

      // Act
      const result = await service.markDeviceAsTrusted('session-123');

      // Assert
      expect(result.isTrusted).toBe(true);
      expect(sessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isTrusted: true })
      );
    });
  });

  describe('updateSessionActivity', () => {
    it('should update session activity successfully', async () => {
      // Arrange
      const sessionToUpdate = { ...mockSession, updateActivity: jest.fn() };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(sessionToUpdate as Session);
      jest
        .spyOn(sessionRepository, 'save')
        .mockResolvedValue(sessionToUpdate as Session);

      // Act
      await service.updateSessionActivity('session-123');

      // Assert
      expect(sessionToUpdate.updateActivity).toHaveBeenCalled();
      expect(sessionRepository.save).toHaveBeenCalledWith(sessionToUpdate);
    });

    it('should throw BadRequestException when session is not active', async () => {
      // Arrange
      const inactiveSession = { ...mockSession, isActive: () => false };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(inactiveSession as Session);

      // Act & Assert
      await expect(
        service.updateSessionActivity('session-123')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('extendSession', () => {
    it('should extend session expiration successfully', async () => {
      // Arrange
      const sessionToExtend = { ...mockSession, extendExpiration: jest.fn() };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(sessionToExtend as Session);
      jest
        .spyOn(sessionRepository, 'save')
        .mockResolvedValue(sessionToExtend as Session);

      // Act
      const result = await service.extendSession('session-123', 60);

      // Assert
      expect(result).toEqual(sessionToExtend);
      expect(sessionToExtend.extendExpiration).toHaveBeenCalledWith(60);
      expect(sessionRepository.save).toHaveBeenCalledWith(sessionToExtend);
    });

    it('should throw BadRequestException when session is not active', async () => {
      // Arrange
      const inactiveSession = { ...mockSession, isActive: () => false };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(inactiveSession as Session);

      // Act & Assert
      await expect(service.extendSession('session-123', 60)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('markSessionAsSuspicious', () => {
    it('should mark session as suspicious', async () => {
      // Arrange
      const sessionToMark = { ...mockSession, markAsSuspicious: jest.fn() };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(sessionToMark as Session);
      jest
        .spyOn(sessionRepository, 'save')
        .mockResolvedValue(sessionToMark as Session);

      // Act
      const result = await service.markSessionAsSuspicious('session-123');

      // Assert
      expect(result).toEqual(sessionToMark);
      expect(sessionToMark.markAsSuspicious).toHaveBeenCalled();
      expect(sessionRepository.save).toHaveBeenCalledWith(sessionToMark);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      // Arrange
      const expiredSessions = [
        { ...mockSession, id: 'expired-1', status: SessionStatus.ACTIVE },
        { ...mockSession, id: 'expired-2', status: SessionStatus.ACTIVE },
      ];
      jest
        .spyOn(sessionRepository, 'find')
        .mockResolvedValue(expiredSessions as Session[]);
      jest.spyOn(sessionRepository, 'save').mockResolvedValue({} as Session);

      // Act
      const result = await service.cleanupExpiredSessions();

      // Assert
      expect(result).toBe(2);
      expect(sessionRepository.find).toHaveBeenCalledWith({
        where: {
          status: SessionStatus.ACTIVE,
          expiresAt: expect.any(Object), // LessThan(new Date())
        },
      });
      expect(sessionRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      // Arrange
      jest.spyOn(sessionRepository, 'count').mockResolvedValue(5);

      // Act
      const result = await service.getSessionStats('user-123');

      // Assert
      expect(result).toEqual({
        total: 5,
        active: 5,
        trusted: 5,
        suspicious: 5,
        expired: 5,
        revoked: 5,
      });
      expect(sessionRepository.count).toHaveBeenCalledTimes(6);
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('should detect IP address change as suspicious', async () => {
      // Arrange
      const session = { ...mockSession, ipAddress: '192.168.1.1' };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(session as Session);

      // Act
      const result = await service.detectSuspiciousActivity(
        'session-123',
        '192.168.1.2'
      );

      // Assert
      expect(result).toBe(true);
    });

    it('should not detect suspicious activity for same IP', async () => {
      // Arrange
      const session = { ...mockSession, ipAddress: '192.168.1.1' };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(session as Session);

      // Act
      const result = await service.detectSuspiciousActivity(
        'session-123',
        '192.168.1.1'
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('generateDeviceFingerprint', () => {
    it('should generate consistent device fingerprint', () => {
      // Arrange
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const ipAddress = '192.168.1.1';

      // Act
      const fingerprint1 = service.generateDeviceFingerprint(
        userAgent,
        ipAddress
      );
      const fingerprint2 = service.generateDeviceFingerprint(
        userAgent,
        ipAddress
      );

      // Assert
      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toHaveLength(64); // SHA-256 hash length
      expect(typeof fingerprint1).toBe('string');
    });

    it('should generate different fingerprints for different inputs', () => {
      // Arrange
      const userAgent1 =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const userAgent2 =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      const ipAddress = '192.168.1.1';

      // Act
      const fingerprint1 = service.generateDeviceFingerprint(
        userAgent1,
        ipAddress
      );
      const fingerprint2 = service.generateDeviceFingerprint(
        userAgent2,
        ipAddress
      );

      // Assert
      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('detectDeviceType', () => {
    it('should detect desktop device', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      expect(service.detectDeviceType(userAgent)).toBe(DeviceType.DESKTOP);
    });

    it('should detect mobile device', () => {
      const userAgent =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15';
      expect(service.detectDeviceType(userAgent)).toBe(DeviceType.MOBILE);
    });

    it('should detect tablet device', () => {
      const userAgent =
        'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15';
      expect(service.detectDeviceType(userAgent)).toBe(DeviceType.TABLET);
    });

    it('should return unknown for unrecognized device', () => {
      const userAgent = 'Unknown User Agent';
      expect(service.detectDeviceType(userAgent)).toBe(DeviceType.UNKNOWN);
    });
  });

  describe('parseBrowserInfo', () => {
    it('should parse Chrome browser info', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      const result = service.parseBrowserInfo(userAgent);
      expect(result.browser).toBe('Chrome');
      expect(result.browserVersion).toBe('91.0');
    });

    it('should parse Firefox browser info', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
      const result = service.parseBrowserInfo(userAgent);
      expect(result.browser).toBe('Firefox');
      expect(result.browserVersion).toBe('89.0');
    });

    it('should parse Safari browser info', () => {
      const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15';
      const result = service.parseBrowserInfo(userAgent);
      expect(result.browser).toBe('Safari');
      expect(result.browserVersion).toBe('14.1');
    });

    it('should return unknown for unrecognized browser', () => {
      const userAgent = 'Unknown Browser';
      const result = service.parseBrowserInfo(userAgent);
      expect(result.browser).toBe('Unknown');
      expect(result.browserVersion).toBe('Unknown');
    });
  });

  describe('parseOperatingSystem', () => {
    it('should parse Windows OS info', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const result = service.parseOperatingSystem(userAgent);
      expect(result.operatingSystem).toBe('Windows');
      expect(result.osVersion).toBe('10.0');
    });

    it('should parse macOS OS info', () => {
      const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
      const result = service.parseOperatingSystem(userAgent);
      expect(result.operatingSystem).toBe('macOS');
      expect(result.osVersion).toBe('10.15');
    });

    it('should parse Linux OS info', () => {
      const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
      const result = service.parseOperatingSystem(userAgent);
      expect(result.operatingSystem).toBe('Linux');
      expect(result.osVersion).toBe('Unknown');
    });

    it('should parse Android OS info', () => {
      const userAgent =
        'Mozilla/5.0 (Linux; Android 11.0; SM-G991B) AppleWebKit/537.36';
      const result = service.parseOperatingSystem(userAgent);
      expect(result.operatingSystem).toBe('Android');
      expect(result.osVersion).toBe('11.0');
    });

    it('should parse iOS OS info', () => {
      const userAgent =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15';
      const result = service.parseOperatingSystem(userAgent);
      expect(result.operatingSystem).toBe('iOS');
      expect(result.osVersion).toBe('14.7');
    });

    it('should return unknown for unrecognized OS', () => {
      const userAgent = 'Unknown OS';
      const result = service.parseOperatingSystem(userAgent);
      expect(result.operatingSystem).toBe('Unknown');
      expect(result.osVersion).toBe('Unknown');
    });
  });
});
