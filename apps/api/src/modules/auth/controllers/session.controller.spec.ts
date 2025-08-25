import { Test, TestingModule } from '@nestjs/testing';
import { SessionController } from './session.controller';
import { SessionService } from '../services/session.service';
import { JwtService } from '../services/jwt.service';
import { Session, SessionStatus, DeviceType } from '../entities/session.entity';

describe('SessionController', () => {
  let controller: SessionController;
  let sessionService: SessionService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockSession: Partial<Session> & { isActive: () => boolean } = {
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
    location: 'New York, NY',
    timezone: 'America/New_York',
    status: SessionStatus.ACTIVE,
    isTrusted: false,
    isRememberMe: false,
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: () => true,
  };

  const mockRequest = {
    user: mockUser,
    headers: {
      'x-session-id': 'current-session-123',
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        {
          provide: SessionService,
          useValue: {
            getUserSessions: jest.fn(),
            getActiveSessions: jest.fn(),
            getSession: jest.fn(),
            updateSession: jest.fn(),
            revokeSession: jest.fn(),
            revokeAllUserSessions: jest.fn(),
            revokeOtherSessions: jest.fn(),
            markDeviceAsTrusted: jest.fn(),
            updateSessionActivity: jest.fn(),
            extendSession: jest.fn(),
            markSessionAsSuspicious: jest.fn(),
            getSessionStats: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            validateTokenFormat: jest.fn().mockReturnValue(true),
            getTokenType: jest.fn().mockReturnValue('access'),
            isTokenExpired: jest.fn().mockReturnValue(false),
            verifyAccessToken: jest
              .fn()
              .mockReturnValue({ id: 'user-123', email: 'test@example.com' }),
          },
        },
      ],
    }).compile();

    controller = module.get<SessionController>(SessionController);
    sessionService = module.get<SessionService>(SessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserSessions', () => {
    it('should return all sessions for the current user', async () => {
      // Arrange
      const sessions = [mockSession, { ...mockSession, id: 'session-456' }];
      const stats = {
        total: 2,
        active: 2,
        trusted: 1,
        suspicious: 0,
        expired: 0,
        revoked: 0,
      };

      jest
        .spyOn(sessionService, 'getUserSessions')
        .mockResolvedValue(sessions as Session[]);
      jest.spyOn(sessionService, 'getSessionStats').mockResolvedValue(stats);

      // Act
      const result = await controller.getUserSessions(mockRequest);

      // Assert
      expect(result).toEqual({
        sessions: sessions.map(session => ({
          ...session,
          isActive: session.isActive(),
        })),
        total: 2,
        activeCount: 2,
        trustedCount: 1,
      });
      expect(sessionService.getUserSessions).toHaveBeenCalledWith('user-123');
      expect(sessionService.getSessionStats).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions for the current user', async () => {
      // Arrange
      const activeSessions = [mockSession];
      jest
        .spyOn(sessionService, 'getActiveSessions')
        .mockResolvedValue(activeSessions as Session[]);

      // Act
      const result = await controller.getActiveSessions(mockRequest);

      // Assert
      expect(result).toEqual(
        activeSessions.map(session => ({
          ...session,
          isActive: session.isActive(),
        }))
      );
      expect(sessionService.getActiveSessions).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getSession', () => {
    it('should return a specific session by ID', async () => {
      // Arrange
      jest
        .spyOn(sessionService, 'getSession')
        .mockResolvedValue(mockSession as Session);

      // Act
      const result = await controller.getSession('session-123');

      // Assert
      expect(result).toEqual({
        ...mockSession,
        isActive: mockSession.isActive(),
      });
      expect(sessionService.getSession).toHaveBeenCalledWith('session-123');
    });
  });

  describe('updateSession', () => {
    it('should update session information', async () => {
      // Arrange
      const updateDto = {
        deviceName: 'Updated Device Name',
        isTrusted: true,
      };
      const updatedSession = { ...mockSession, ...updateDto };
      jest
        .spyOn(sessionService, 'updateSession')
        .mockResolvedValue(updatedSession as Session);

      // Act
      const result = await controller.updateSession('session-123', updateDto);

      // Assert
      expect(result).toEqual({
        ...updatedSession,
        isActive: updatedSession.isActive(),
      });
      expect(sessionService.updateSession).toHaveBeenCalledWith(
        'session-123',
        updateDto
      );
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session', async () => {
      // Arrange
      const revokeDto = { reason: 'Security concern' };
      jest.spyOn(sessionService, 'revokeSession').mockResolvedValue();

      // Act
      await controller.revokeSession('session-123', revokeDto);

      // Assert
      expect(sessionService.revokeSession).toHaveBeenCalledWith(
        'session-123',
        revokeDto
      );
    });

    it('should revoke a session without reason', async () => {
      // Arrange
      jest.spyOn(sessionService, 'revokeSession').mockResolvedValue();

      // Act
      await controller.revokeSession('session-123', {});

      // Assert
      expect(sessionService.revokeSession).toHaveBeenCalledWith(
        'session-123',
        {}
      );
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions for the current user', async () => {
      // Arrange
      const revokeDto = { reason: 'Logout all devices' };
      jest.spyOn(sessionService, 'revokeAllUserSessions').mockResolvedValue();

      // Act
      await controller.revokeAllSessions(mockRequest, revokeDto);

      // Assert
      expect(sessionService.revokeAllUserSessions).toHaveBeenCalledWith(
        'user-123',
        'Logout all devices'
      );
    });
  });

  describe('revokeOtherSessions', () => {
    it('should revoke all other sessions except the current one', async () => {
      // Arrange
      const revokeDto = { reason: 'Security concern' };
      jest.spyOn(sessionService, 'revokeOtherSessions').mockResolvedValue();

      // Act
      await controller.revokeOtherSessions(mockRequest, revokeDto);

      // Assert
      expect(sessionService.revokeOtherSessions).toHaveBeenCalledWith(
        'user-123',
        'current-session-123',
        'Security concern'
      );
    });

    it('should throw error when current session ID is missing', async () => {
      // Arrange
      const requestWithoutSessionId = {
        user: mockUser,
        headers: {},
      } as any;
      const revokeDto = { reason: 'Security concern' };

      // Act & Assert
      await expect(
        controller.revokeOtherSessions(requestWithoutSessionId, revokeDto)
      ).rejects.toThrow('Current session ID is required');
    });
  });

  describe('markDeviceAsTrusted', () => {
    it('should mark a device as trusted', async () => {
      // Arrange
      const trustedSession = { ...mockSession, isTrusted: true };
      jest
        .spyOn(sessionService, 'markDeviceAsTrusted')
        .mockResolvedValue(trustedSession as Session);

      // Act
      const result = await controller.markDeviceAsTrusted('session-123');

      // Assert
      expect(result).toEqual({
        ...trustedSession,
        isActive: trustedSession.isActive(),
      });
      expect(sessionService.markDeviceAsTrusted).toHaveBeenCalledWith(
        'session-123'
      );
    });
  });

  describe('updateSessionActivity', () => {
    it('should update session activity', async () => {
      // Arrange
      jest.spyOn(sessionService, 'updateSessionActivity').mockResolvedValue();

      // Act
      await controller.updateSessionActivity('session-123');

      // Assert
      expect(sessionService.updateSessionActivity).toHaveBeenCalledWith(
        'session-123'
      );
    });
  });

  describe('extendSession', () => {
    it('should extend session expiration', async () => {
      // Arrange
      const body = { additionalMinutes: 60 };
      const extendedSession = { ...mockSession };
      jest
        .spyOn(sessionService, 'extendSession')
        .mockResolvedValue(extendedSession as Session);

      // Act
      const result = await controller.extendSession('session-123', body);

      // Assert
      expect(result).toEqual({
        ...extendedSession,
        isActive: extendedSession.isActive(),
      });
      expect(sessionService.extendSession).toHaveBeenCalledWith(
        'session-123',
        60
      );
    });
  });

  describe('markSessionAsSuspicious', () => {
    it('should mark session as suspicious', async () => {
      // Arrange
      const suspiciousSession = {
        ...mockSession,
        status: SessionStatus.SUSPICIOUS,
      };
      jest
        .spyOn(sessionService, 'markSessionAsSuspicious')
        .mockResolvedValue(suspiciousSession as Session);

      // Act
      const result = await controller.markSessionAsSuspicious('session-123');

      // Assert
      expect(result).toEqual({
        ...suspiciousSession,
        isActive: suspiciousSession.isActive(),
      });
      expect(sessionService.markSessionAsSuspicious).toHaveBeenCalledWith(
        'session-123'
      );
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      // Arrange
      const stats = {
        total: 5,
        active: 3,
        trusted: 2,
        suspicious: 1,
        expired: 1,
        revoked: 0,
      };
      jest.spyOn(sessionService, 'getSessionStats').mockResolvedValue(stats);

      // Act
      const result = await controller.getSessionStats(mockRequest);

      // Assert
      expect(result).toEqual(stats);
      expect(sessionService.getSessionStats).toHaveBeenCalledWith('user-123');
    });
  });
});
