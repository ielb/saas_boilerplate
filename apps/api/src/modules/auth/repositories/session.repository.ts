import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionStatus } from '../entities/session.entity';

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>
  ) {}

  async findByUserId(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByRefreshTokenHash(
    refreshTokenHash: string
  ): Promise<Session | null> {
    return this.sessionRepository.findOne({
      where: { refreshTokenHash },
    });
  }

  async findActiveSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { userId, status: SessionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteExpiredSessions(): Promise<void> {
    const expiredDate = new Date();
    await this.sessionRepository
      .createQueryBuilder()
      .delete()
      .from(Session)
      .where('expiresAt < :expiredDate', { expiredDate })
      .execute();
  }
}
