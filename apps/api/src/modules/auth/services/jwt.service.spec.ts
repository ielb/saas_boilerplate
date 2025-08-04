import { Test, TestingModule } from '@nestjs/testing';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

import { JwtService } from './jwt.service';
import { UserRole, UserStatus } from '@app/shared';

describe('JwtService', () => {
  let service: JwtService;
  let nestJwtService: NestJwtService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    tenantId: 'tenant-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: NestJwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
    nestJwtService = module.get<NestJwtService>(NestJwtService);
  });

  describe('generateAccessToken', () => {
    it('should generate access token successfully', () => {
      // Arrange
      const mockToken = 'mock.access.token';
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        status: mockUser.status,
        tenantId: mockUser.tenantId,
      };

      jest.spyOn(nestJwtService, 'sign').mockReturnValue(mockToken);

      // Act
      const result = service.generateAccessToken(payload);

      // Assert
      expect(result).toBe(mockToken);
      expect(nestJwtService.sign).toHaveBeenCalledWith(payload, {
        secret: expect.any(String),
        expiresIn: expect.any(String),
        issuer: 'saas-boilerplate',
        audience: 'saas-boilerplate-users',
      });
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token successfully', () => {
      // Arrange
      const mockToken = 'mock.refresh.token';
      const userId = 'user-123';
      const tokenId = 'token-456';

      jest.spyOn(nestJwtService, 'sign').mockReturnValue(mockToken);

      // Act
      const result = service.generateRefreshToken(userId, tokenId);

      // Assert
      expect(result).toBe(mockToken);
      expect(nestJwtService.sign).toHaveBeenCalledWith(
        { sub: userId, tokenId },
        {
          secret: expect.any(String),
          expiresIn: expect.any(String),
          issuer: 'saas-boilerplate',
          audience: 'saas-boilerplate-refresh',
        }
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token successfully', () => {
      // Arrange
      const token = 'valid.access.token';
      const expectedPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        status: mockUser.status,
        tenantId: mockUser.tenantId,
        iat: 1234567890,
        exp: 1234567890 + 900,
      };

      jest.spyOn(nestJwtService, 'verify').mockReturnValue(expectedPayload);

      // Act
      const result = service.verifyAccessToken(token);

      // Assert
      expect(result).toEqual(expectedPayload);
      expect(nestJwtService.verify).toHaveBeenCalledWith(token, {
        secret: expect.any(String),
        issuer: 'saas-boilerplate',
        audience: 'saas-boilerplate-users',
      });
    });

    it('should handle invalid access token', () => {
      // Arrange
      const token = 'invalid.access.token';

      jest.spyOn(nestJwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      expect(() => service.verifyAccessToken(token)).toThrow(
        UnauthorizedException
      );
      expect(nestJwtService.verify).toHaveBeenCalledWith(token, {
        secret: expect.any(String),
        issuer: 'saas-boilerplate',
        audience: 'saas-boilerplate-users',
      });
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token successfully', () => {
      // Arrange
      const token = 'valid.refresh.token';
      const expectedPayload = {
        sub: 'user-123',
        tokenId: 'token-456',
        iat: 1234567890,
        exp: 1234567890 + 604800,
      };

      jest.spyOn(nestJwtService, 'verify').mockReturnValue(expectedPayload);

      // Act
      const result = service.verifyRefreshToken(token);

      // Assert
      expect(result).toEqual(expectedPayload);
      expect(nestJwtService.verify).toHaveBeenCalledWith(token, {
        secret: expect.any(String),
        issuer: 'saas-boilerplate',
        audience: 'saas-boilerplate-refresh',
      });
    });

    it('should handle invalid refresh token', () => {
      // Arrange
      const token = 'invalid.refresh.token';

      jest.spyOn(nestJwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      expect(() => service.verifyRefreshToken(token)).toThrow(
        UnauthorizedException
      );
      expect(nestJwtService.verify).toHaveBeenCalledWith(token, {
        secret: expect.any(String),
        issuer: 'saas-boilerplate',
        audience: 'saas-boilerplate-refresh',
      });
    });
  });

  describe('decodeToken', () => {
    it('should decode token successfully', () => {
      // Arrange
      const token = 'mock.jwt.token';
      const expectedPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        iat: 1234567890,
        exp: 1234567890 + 900,
      };

      jest.spyOn(nestJwtService, 'decode').mockReturnValue(expectedPayload);

      // Act
      const result = service.decodeToken(token);

      // Assert
      expect(result).toEqual(expectedPayload);
      expect(nestJwtService.decode).toHaveBeenCalledWith(token);
    });

    it('should handle token decode failure', () => {
      // Arrange
      const token = 'invalid.jwt.token';

      jest.spyOn(nestJwtService, 'decode').mockReturnValue(null);

      // Act
      const result = service.decodeToken(token);

      // Assert
      expect(result).toBeNull();
      expect(nestJwtService.decode).toHaveBeenCalledWith(token);
    });
  });

  describe('getTokenExpiration', () => {
    it('should get token expiration successfully', () => {
      // Arrange
      const token = 'mock.jwt.token';
      const expirationTime = new Date(Date.now() + 900 * 1000); // 15 minutes from now
      const expirationSeconds = Math.floor(expirationTime.getTime() / 1000);
      const expectedExpirationTime = new Date(expirationSeconds * 1000);
      const decodedPayload = {
        sub: mockUser.id,
        exp: expirationSeconds,
      };

      jest.spyOn(nestJwtService, 'decode').mockReturnValue(decodedPayload);

      // Act
      const result = service.getTokenExpiration(token);

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBe(expectedExpirationTime.getTime());
      expect(nestJwtService.decode).toHaveBeenCalledWith(token);
    });

    it('should handle token without expiration', () => {
      // Arrange
      const token = 'mock.jwt.token';
      const decodedPayload = { sub: mockUser.id }; // No exp field

      jest.spyOn(nestJwtService, 'decode').mockReturnValue(decodedPayload);

      // Act
      const result = service.getTokenExpiration(token);

      // Assert
      expect(result).toBeNull();
      expect(nestJwtService.decode).toHaveBeenCalledWith(token);
    });

    it('should handle invalid token for expiration check', () => {
      // Arrange
      const token = 'invalid.jwt.token';

      jest.spyOn(nestJwtService, 'decode').mockReturnValue(null);

      // Act
      const result = service.getTokenExpiration(token);

      // Assert
      expect(result).toBeNull();
      expect(nestJwtService.decode).toHaveBeenCalledWith(token);
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired token', () => {
      // Arrange
      const token = 'expired.jwt.token';
      const expiredTime = new Date(Date.now() - 1000 * 1000); // 1 hour ago
      const decodedPayload = {
        sub: mockUser.id,
        exp: Math.floor(expiredTime.getTime() / 1000),
      };

      jest.spyOn(nestJwtService, 'decode').mockReturnValue(decodedPayload);

      // Act
      const result = service.isTokenExpired(token);

      // Assert
      expect(result).toBe(true);
      expect(nestJwtService.decode).toHaveBeenCalledWith(token);
    });

    it('should return false for valid token', () => {
      // Arrange
      const token = 'valid.jwt.token';
      const validTime = new Date(Date.now() + 1000 * 1000); // 1 hour from now
      const decodedPayload = {
        sub: mockUser.id,
        exp: Math.floor(validTime.getTime() / 1000),
      };

      jest.spyOn(nestJwtService, 'decode').mockReturnValue(decodedPayload);

      // Act
      const result = service.isTokenExpired(token);

      // Assert
      expect(result).toBe(false);
      expect(nestJwtService.decode).toHaveBeenCalledWith(token);
    });

    it('should return true for token without expiration', () => {
      // Arrange
      const token = 'mock.jwt.token';
      const decodedPayload = { sub: mockUser.id }; // No exp field

      jest.spyOn(nestJwtService, 'decode').mockReturnValue(decodedPayload);

      // Act
      const result = service.isTokenExpired(token);

      // Assert
      expect(result).toBe(true);
      expect(nestJwtService.decode).toHaveBeenCalledWith(token);
    });
  });

  describe('generateTokenPair', () => {
    it('should generate token pair successfully', () => {
      // Arrange
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';

      jest
        .spyOn(service, 'generateAccessToken')
        .mockReturnValue(mockAccessToken);
      jest
        .spyOn(service, 'generateRefreshToken')
        .mockReturnValue(mockRefreshToken);

      // Act
      const result = service.generateTokenPair(mockUser);

      // Assert
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: expect.any(Number),
      });
      expect(service.generateAccessToken).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
      });
      expect(service.generateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String)
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', () => {
      // Arrange
      const refreshToken = 'valid.refresh.token';
      const mockAccessToken = 'new.access.token';
      const mockRefreshTokenPayload = {
        sub: mockUser.id,
        tokenId: 'token-456',
      };

      jest
        .spyOn(service, 'verifyRefreshToken')
        .mockReturnValue(mockRefreshTokenPayload);
      jest
        .spyOn(service, 'generateAccessToken')
        .mockReturnValue(mockAccessToken);

      // Act
      const result = service.refreshAccessToken(refreshToken, mockUser);

      // Assert
      expect(result).toEqual({
        accessToken: mockAccessToken,
        expiresIn: expect.any(Number),
      });
      expect(service.verifyRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(service.generateAccessToken).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
      });
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid authorization header', () => {
      // Arrange
      const authHeader = 'Bearer mock.jwt.token';

      // Act
      const result = service.extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBe('mock.jwt.token');
    });

    it('should return null for invalid authorization header', () => {
      // Arrange
      const authHeader = 'InvalidHeader';

      // Act
      const result = service.extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for empty authorization header', () => {
      // Arrange
      const authHeader = '';

      // Act
      const result = service.extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('validateTokenFormat', () => {
    it('should validate correct token format', () => {
      // Arrange
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      // Act
      const result = service.validateTokenFormat(token);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject invalid token format', () => {
      // Arrange
      const token = 'invalid.token'; // Only 2 parts

      // Act
      const result = service.validateTokenFormat(token);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getTokenType', () => {
    it('should identify access token', () => {
      // Arrange
      const token = 'mock.access.token';
      const decodedPayload = {
        sub: 'user-123',
        aud: 'saas-boilerplate-users',
      };

      jest.spyOn(nestJwtService, 'decode').mockReturnValue(decodedPayload);

      // Act
      const result = service.getTokenType(token);

      // Assert
      expect(result).toBe('access');
      expect(nestJwtService.decode).toHaveBeenCalledWith(token);
    });

    it('should identify refresh token', () => {
      // Arrange
      const token = 'mock.refresh.token';
      const decodedPayload = {
        sub: 'user-123',
        tokenId: 'token-456',
        aud: 'saas-boilerplate-refresh',
      };

      jest.spyOn(nestJwtService, 'decode').mockReturnValue(decodedPayload);

      // Act
      const result = service.getTokenType(token);

      // Assert
      expect(result).toBe('refresh');
      expect(nestJwtService.decode).toHaveBeenCalledWith(token);
    });

    it('should identify unknown token type', () => {
      // Arrange
      const token = 'invalid.token';

      // Act
      const result = service.getTokenType(token);

      // Assert
      expect(result).toBe('unknown');
    });
  });
});
