import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';

import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../users/entities/user.entity';
import { UserStatus, UserRole } from '@app/shared';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let refreshTokenRepository: Repository<RefreshToken>;
  let userRepository: Repository<User>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    tenantId: 'tenant-123',
  };

  const mockRefreshToken: Partial<RefreshToken> = {
    id: 'token-123',
    tokenId: 'token-id-123',
    userId: 'user-123',
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    isRevoked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken)
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('createRefreshToken', () => {
    it('should create refresh token successfully', async () => {
      // Arrange
      const deviceInfo = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceId: 'device-123',
        deviceName: 'Test Device',
        deviceType: 'mobile',
        location: 'New York',
      };

      const createdToken = { ...mockRefreshToken, ...deviceInfo };
      jest
        .spyOn(refreshTokenRepository, 'create')
        .mockReturnValue(createdToken as RefreshToken);
      jest
        .spyOn(refreshTokenRepository, 'save')
        .mockResolvedValue(createdToken as RefreshToken);

      // Act
      const result = await service.createRefreshToken(
        mockUser as User,
        deviceInfo
      );

      // Assert
      expect(result).toEqual(createdToken);
      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          tokenId: expect.any(String),
          tokenHash: '',
          expiresAt: expect.any(Date),
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent,
          deviceId: deviceInfo.deviceId,
          deviceName: deviceInfo.deviceName,
          deviceType: deviceInfo.deviceType,
          location: deviceInfo.location,
        })
      );
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(createdToken);
    });

    it('should create refresh token without device info', async () => {
      // Arrange
      const createdToken = { ...mockRefreshToken };
      jest
        .spyOn(refreshTokenRepository, 'create')
        .mockReturnValue(createdToken as RefreshToken);
      jest
        .spyOn(refreshTokenRepository, 'save')
        .mockResolvedValue(createdToken as RefreshToken);

      // Act
      const result = await service.createRefreshToken(mockUser as User);

      // Assert
      expect(result).toEqual(createdToken);
      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          tokenId: expect.any(String),
          tokenHash: '',
          expiresAt: expect.any(Date),
        })
      );
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(createdToken);
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate refresh token successfully', async () => {
      // Arrange
      // Create a valid JWT token with the expected tokenId in the payload
      const tokenId = 'token-id-123';
      const payload = { tokenId, sub: 'user-123' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        'base64'
      );
      const token = `header.${encodedPayload}.signature`;
      const tokenHash = 'hashed-token';

      jest.spyOn(service, 'hashToken').mockReturnValue(tokenHash);
      jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue({
        ...mockRefreshToken,
        user: mockUser,
        isValid: () => true,
      } as any);

      // Act
      const result = await service.validateRefreshToken(token);

      // Assert
      expect(result).toEqual(mockUser);
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { tokenId },
        relations: ['user'],
      });
    });

    it('should throw error for invalid token', async () => {
      // Arrange
      const token = 'invalid.token.format';

      // Act & Assert
      await expect(service.validateRefreshToken(token)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw error for non-existent token', async () => {
      // Arrange
      const tokenId = 'non-existent-token';
      const payload = { tokenId, sub: 'user-123' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        'base64'
      );
      const token = `header.${encodedPayload}.signature`;

      jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateRefreshToken(token)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw error for expired token', async () => {
      // Arrange
      const tokenId = 'token-id-123';
      const payload = { tokenId, sub: 'user-123' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        'base64'
      );
      const token = `header.${encodedPayload}.signature`;

      jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue({
        ...mockRefreshToken,
        user: mockUser,
        isValid: () => false,
      } as any);

      // Act & Assert
      await expect(service.validateRefreshToken(token)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token successfully', async () => {
      // Arrange
      const tokenId = 'token-id-123';
      const refreshToken = {
        ...mockRefreshToken,
        revoke: jest.fn(),
      };

      jest
        .spyOn(refreshTokenRepository, 'findOne')
        .mockResolvedValue(refreshToken as any);
      jest
        .spyOn(refreshTokenRepository, 'save')
        .mockResolvedValue(refreshToken as any);

      // Act
      await service.revokeRefreshToken(tokenId);

      // Assert
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { tokenId },
      });
      expect(refreshToken.revoke).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(refreshToken);
    });

    it('should handle revoking non-existent token', async () => {
      // Arrange
      const tokenId = 'non-existent-token';

      jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue(null);

      // Act
      await service.revokeRefreshToken(tokenId);

      // Assert
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { tokenId },
      });
      expect(refreshTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all user tokens successfully', async () => {
      // Arrange
      const userId = 'user-123';

      jest
        .spyOn(refreshTokenRepository, 'update')
        .mockResolvedValue({ affected: 3 } as any);

      // Act
      await service.revokeAllUserTokens(userId);

      // Assert
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId, isRevoked: false },
        { isRevoked: true }
      );
    });

    it('should handle revoking tokens for user with no active tokens', async () => {
      // Arrange
      const userId = 'user-with-no-tokens';

      jest
        .spyOn(refreshTokenRepository, 'update')
        .mockResolvedValue({ affected: 0 } as any);

      // Act
      await service.revokeAllUserTokens(userId);

      // Assert
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId, isRevoked: false },
        { isRevoked: true }
      );
    });
  });

  describe('getUserTokens', () => {
    it('should get user tokens successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const userTokens = [
        mockRefreshToken,
        { ...mockRefreshToken, id: 'token-456' },
      ];

      jest
        .spyOn(refreshTokenRepository, 'find')
        .mockResolvedValue(userTokens as any);

      // Act
      const result = await service.getUserTokens(userId);

      // Assert
      expect(result).toEqual(userTokens);
      expect(refreshTokenRepository.find).toHaveBeenCalledWith({
        where: { userId, isRevoked: false },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array for user with no tokens', async () => {
      // Arrange
      const userId = 'user-with-no-tokens';

      jest.spyOn(refreshTokenRepository, 'find').mockResolvedValue([]);

      // Act
      const result = await service.getUserTokens(userId);

      // Assert
      expect(result).toEqual([]);
      expect(refreshTokenRepository.find).toHaveBeenCalledWith({
        where: { userId, isRevoked: false },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens successfully', async () => {
      // Arrange
      const expiredDate = new Date();

      jest
        .spyOn(refreshTokenRepository, 'delete')
        .mockResolvedValue({ affected: 2 } as any);

      // Act
      const result = await service.cleanupExpiredTokens();

      // Assert
      expect(result).toBe(2);
      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
        expiresAt: expect.any(Date),
      });
    });

    it('should handle cleanup when no expired tokens exist', async () => {
      // Arrange
      const expiredDate = new Date();

      jest
        .spyOn(refreshTokenRepository, 'delete')
        .mockResolvedValue({ affected: 0 } as any);

      // Act
      const result = await service.cleanupExpiredTokens();

      // Assert
      expect(result).toBe(0);
      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
        expiresAt: expect.any(Date),
      });
    });
  });

  describe('hashToken', () => {
    it('should hash JWT token correctly', () => {
      // Arrange
      const token = 'header.payload.signature';

      // Act
      const result = service.hashToken(token);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBe(64); // SHA-256 hash length
    });

    it('should hash non-JWT token correctly', () => {
      // Arrange
      const token = 'simple-token';

      // Act
      const result = service.hashToken(token);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBe(64); // SHA-256 hash length
    });
  });

  describe('updateTokenHash', () => {
    it('should update token hash successfully', async () => {
      // Arrange
      const tokenId = 'token-id-123';
      const newHash = 'new-hashed-token';

      jest
        .spyOn(refreshTokenRepository, 'update')
        .mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.updateTokenHash(tokenId, newHash);

      // Assert
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { tokenId },
        { tokenHash: newHash }
      );
    });

    it('should handle updating non-existent token', async () => {
      // Arrange
      const tokenId = 'non-existent-token';
      const newHash = 'new-hashed-token';

      jest
        .spyOn(refreshTokenRepository, 'update')
        .mockResolvedValue({ affected: 0 } as any);

      // Act
      await service.updateTokenHash(tokenId, newHash);

      // Assert
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { tokenId },
        { tokenHash: newHash }
      );
    });
  });

  describe('detectTokenReuse', () => {
    it('should detect token reuse successfully', async () => {
      // Arrange
      const tokenId = 'token-id-123';
      const payload = { tokenId, sub: 'user-123' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        'base64'
      );
      const token = `header.${encodedPayload}.signature`;
      const revokedToken = { ...mockRefreshToken, isRevoked: true };

      jest
        .spyOn(refreshTokenRepository, 'findOne')
        .mockResolvedValue(revokedToken as any);

      // Act
      const result = await service.detectTokenReuse(token);

      // Assert
      expect(result).toBe(true);
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { tokenId },
      });
    });

    it('should return false for non-reused token', async () => {
      // Arrange
      const tokenId = 'token-id-123';
      const payload = { tokenId, sub: 'user-123' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        'base64'
      );
      const token = `header.${encodedPayload}.signature`;
      const activeToken = { ...mockRefreshToken, isRevoked: false };

      jest
        .spyOn(refreshTokenRepository, 'findOne')
        .mockResolvedValue(activeToken as any);

      // Act
      const result = await service.detectTokenReuse(token);

      // Assert
      expect(result).toBe(false);
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { tokenId },
      });
    });

    it('should return false for invalid token', async () => {
      // Arrange
      const token = 'invalid.token';

      // Act
      const result = await service.detectTokenReuse(token);

      // Assert
      expect(result).toBe(false);
      expect(refreshTokenRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('getUserTokenStats', () => {
    it('should get user token stats successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockStats = {
        totalTokens: 5,
        activeTokens: 3,
        expiredTokens: 1,
        revokedTokens: 1,
      };

      jest
        .spyOn(refreshTokenRepository, 'count')
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(3) // active
        .mockResolvedValueOnce(1) // expired
        .mockResolvedValueOnce(1); // revoked

      // Act
      const result = await service.getUserTokenStats(userId);

      // Assert
      expect(result).toEqual(mockStats);
      expect(refreshTokenRepository.count).toHaveBeenCalledTimes(4);
    });
  });
});
