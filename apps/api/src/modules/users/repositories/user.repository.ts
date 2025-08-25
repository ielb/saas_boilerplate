import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';

@Injectable()
export class UserRepository extends TenantScopedRepository<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {
    super(
      userRepository.target,
      userRepository.manager,
      userRepository.queryRunner
    );
  }

  protected getTenantIdField(): string {
    return 'tenantId';
  }

  protected override shouldScopeByTenant(): boolean {
    return true;
  }

  /**
   * Find user by email within current tenant
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOneWithTenantScope({
      where: { email },
    });
  }

  /**
   * Find user by external ID within current tenant
   */
  async findByExternalId(externalId: string): Promise<User | null> {
    return this.findOneWithTenantScope({
      where: { externalId },
    });
  }

  /**
   * Find users by role within current tenant
   */
  async findByRole(role: string): Promise<User[]> {
    return this.createTenantScopedQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('role.name = :role', { role })
      .getMany();
  }

  /**
   * Find active users within current tenant
   */
  async findActiveUsers(): Promise<User[]> {
    return this.findWithTenantScope({
      where: { status: 'ACTIVE' },
    });
  }

  /**
   * Count users by status within current tenant
   */
  async countByStatus(status: string): Promise<number> {
    return this.countWithTenantScope({
      where: { status },
    });
  }

  /**
   * Find users with pagination within current tenant
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<{ users: User[]; total: number }> {
    const queryBuilder = this.createTenantScopedQueryBuilder('user');

    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply safe pagination
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    const [users, total] = await queryBuilder
      .skip(offset)
      .take(safeLimit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return { users, total };
  }

  /**
   * Find users by multiple IDs within current tenant
   */
  override async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];

    return this.createTenantScopedQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids })
      .getMany();
  }

  /**
   * Check if email exists within current tenant
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.countWithTenantScope({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Find users by last login date within current tenant
   */
  async findUsersByLastLogin(days: number): Promise<User[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return this.createTenantScopedQueryBuilder('user')
      .where('user.lastLoginAt >= :date', { date })
      .getMany();
  }

  /**
   * Get user statistics within current tenant
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    suspended: number;
  }> {
    const [total, active, pending, suspended] = await Promise.all([
      this.countWithTenantScope(),
      this.countWithTenantScope({ where: { status: 'ACTIVE' } }),
      this.countWithTenantScope({ where: { status: 'PENDING' } }),
      this.countWithTenantScope({ where: { status: 'SUSPENDED' } }),
    ]);

    return { total, active, pending, suspended };
  }
}
