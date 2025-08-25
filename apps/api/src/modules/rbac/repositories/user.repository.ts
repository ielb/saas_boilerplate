import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
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
   * Find users by role within current tenant
   */
  async findByRole(role: string): Promise<User[]> {
    return this.createTenantScopedQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('role.name = :role', { role })
      .getMany();
  }
}
