import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>
  ) {}

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByTokenId(tokenId: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findOne({
      where: { tokenId },
    });
  }

  async findActiveTokens(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteExpiredTokens(): Promise<void> {
    const expiredDate = new Date();
    await this.refreshTokenRepository.delete({
      expiresAt: { $lt: expiredDate } as any,
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update({ userId }, { isRevoked: true });
  }
}
