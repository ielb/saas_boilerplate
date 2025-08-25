import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleLevel } from '../entities/role.entity';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';

@Injectable()
export class RoleRepository extends TenantScopedRepository<Role> {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>
  ) {
    super(
      roleRepository.target,
      roleRepository.manager,
      roleRepository.queryRunner
    );
  }

  protected override getTenantIdField(): string {
    return 'tenantId';
  }

  protected override shouldScopeByTenant(): boolean {
    return true;
  }

  /**
   * Find role by name within current tenant
   */
  async findByName(name: string): Promise<Role | null> {
    return this.findOneWithTenantScope({
      where: { name },
    });
  }

  /**
   * Find roles by level within current tenant
   */
  async findByLevel(level: RoleLevel): Promise<Role[]> {
    return this.findWithTenantScope({
      where: { level },
    });
  }

  /**
   * Find system roles (not tenant-scoped)
   */
  async findSystemRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      where: { isSystem: true },
    });
  }

  /**
   * Find custom roles within current tenant
   */
  async findCustomRoles(): Promise<Role[]> {
    return this.findWithTenantScope({
      where: { isSystem: false },
    });
  }

  /**
   * Find roles with pagination within current tenant
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 50,
    level?: RoleLevel
  ): Promise<{ roles: Role[]; total: number }> {
    const queryBuilder = this.createTenantScopedQueryBuilder(
      'role'
    ).leftJoinAndSelect('role.permissions', 'permissions');

    if (level) {
      queryBuilder.andWhere('role.level = :level', { level });
    }

    // Apply safe pagination
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    const [roles, total] = await queryBuilder
      .skip(offset)
      .take(safeLimit)
      .orderBy('role.level', 'ASC')
      .addOrderBy('role.name', 'ASC')
      .getManyAndCount();

    return { roles, total };
  }

  /**
   * Find roles by multiple IDs within current tenant
   */
  override async findByIds(ids: string[]): Promise<Role[]> {
    if (ids.length === 0) return [];

    return this.createTenantScopedQueryBuilder('role')
      .where('role.id IN (:...ids)', { ids })
      .getMany();
  }

  /**
   * Find parent roles within current tenant
   */
  async findParentRoles(): Promise<Role[]> {
    return this.createTenantScopedQueryBuilder('role')
      .where('role.parentRoleId IS NULL')
      .getMany();
  }

  /**
   * Find child roles of a specific role within current tenant
   */
  async findChildRoles(parentRoleId: string): Promise<Role[]> {
    return this.findWithTenantScope({
      where: { parentRoleId },
    });
  }

  /**
   * Count roles by level within current tenant
   */
  async countByLevel(level: RoleLevel): Promise<number> {
    return this.countWithTenantScope({
      where: { level },
    });
  }

  /**
   * Check if role name exists within current tenant
   */
  async nameExists(name: string): Promise<boolean> {
    const count = await this.countWithTenantScope({
      where: { name },
    });
    return count > 0;
  }

  /**
   * Find roles with permissions within current tenant
   */
  async findWithPermissions(): Promise<Role[]> {
    return this.createTenantScopedQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .orderBy('role.level', 'ASC')
      .addOrderBy('role.name', 'ASC')
      .getMany();
  }

  /**
   * Get role statistics within current tenant
   */
  async getRoleStats(): Promise<{
    total: number;
    system: number;
    custom: number;
    byLevel: Record<RoleLevel, number>;
  }> {
    const [total, system, custom] = await Promise.all([
      this.countWithTenantScope(),
      this.countWithTenantScope({ where: { isSystem: true } }),
      this.countWithTenantScope({ where: { isSystem: false } }),
    ]);

    const byLevel = {} as Record<RoleLevel, number>;
    for (const level of Object.values(RoleLevel)) {
      if (typeof level === 'number') {
        byLevel[level as RoleLevel] = await this.countByLevel(
          level as RoleLevel
        );
      }
    }

    return { total, system, custom, byLevel };
  }
}
