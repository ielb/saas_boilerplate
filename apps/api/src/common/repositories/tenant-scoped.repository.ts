import {
  Repository,
  SelectQueryBuilder,
  FindOptionsWhere,
  ObjectLiteral,
} from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import {
  getCurrentTenantId,
  requireTenantContext,
} from '../interceptors/tenant-scoping.interceptor';

@Injectable()
export abstract class TenantScopedRepository<
  T extends ObjectLiteral,
> extends Repository<T> {
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * Get the tenant ID field name for this entity
   */
  protected abstract getTenantIdField(): string;

  /**
   * Check if the entity should be tenant-scoped
   */
  protected shouldScopeByTenant(): boolean {
    return true; // Override in subclasses if needed
  }

  /**
   * Apply tenant scoping to a query builder
   */
  protected applyTenantScope(
    queryBuilder: SelectQueryBuilder<T>
  ): SelectQueryBuilder<T> {
    if (!this.shouldScopeByTenant()) {
      return queryBuilder;
    }

    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      this.logger.warn('No tenant context available for query scoping');
      return queryBuilder;
    }

    const tenantField = this.getTenantIdField();
    return queryBuilder.andWhere(
      `${queryBuilder.alias}.${tenantField} = :tenantId`,
      {
        tenantId,
      }
    );
  }

  /**
   * Apply tenant scoping to find options
   */
  protected applyTenantScopeToWhere(
    where: FindOptionsWhere<T>
  ): FindOptionsWhere<T> {
    if (!this.shouldScopeByTenant()) {
      return where;
    }

    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      this.logger.warn('No tenant context available for query scoping');
      return where;
    }

    const tenantField = this.getTenantIdField();
    return {
      ...where,
      [tenantField]: tenantId,
    };
  }

  /**
   * Find with tenant scoping
   */
  async findWithTenantScope(options?: any): Promise<T[]> {
    if (options?.where) {
      options.where = this.applyTenantScopeToWhere(options.where);
    }
    return super.find(options);
  }

  /**
   * Find one with tenant scoping
   */
  async findOneWithTenantScope(options?: any): Promise<T | null> {
    if (options?.where) {
      options.where = this.applyTenantScopeToWhere(options.where);
    }
    return super.findOne(options);
  }

  /**
   * Find one by with tenant scoping
   */
  async findOneByWithTenantScope(
    where: FindOptionsWhere<T>
  ): Promise<T | null> {
    const scopedWhere = this.applyTenantScopeToWhere(where);
    return super.findOneBy(scopedWhere);
  }

  /**
   * Find by with tenant scoping
   */
  async findByWithTenantScope(where: FindOptionsWhere<T>): Promise<T[]> {
    const scopedWhere = this.applyTenantScopeToWhere(where);
    return super.findBy(scopedWhere);
  }

  /**
   * Count with tenant scoping
   */
  async countWithTenantScope(options?: any): Promise<number> {
    if (options?.where) {
      options.where = this.applyTenantScopeToWhere(options.where);
    }
    return super.count(options);
  }

  /**
   * Count by with tenant scoping
   */
  async countByWithTenantScope(where: FindOptionsWhere<T>): Promise<number> {
    const scopedWhere = this.applyTenantScopeToWhere(where);
    return super.countBy(scopedWhere);
  }

  /**
   * Save with tenant ID setting
   */
  async saveWithTenantScope(entity: any): Promise<T> {
    if (this.shouldScopeByTenant()) {
      const tenantId = requireTenantContext();
      const tenantField = this.getTenantIdField();

      // Set tenant ID if not already set
      if (!entity[tenantField]) {
        entity[tenantField] = tenantId;
      }
    }

    return super.save(entity);
  }

  /**
   * Insert with tenant ID setting
   */
  async insertWithTenantScope(entity: any): Promise<any> {
    if (this.shouldScopeByTenant()) {
      const tenantId = requireTenantContext();
      const tenantField = this.getTenantIdField();

      // Set tenant ID if not already set
      if (!entity[tenantField]) {
        entity[tenantField] = tenantId;
      }
    }

    return super.insert(entity);
  }

  /**
   * Update with tenant scoping
   */
  async updateWithTenantScope(criteria: any, partialEntity: any): Promise<any> {
    if (this.shouldScopeByTenant()) {
      const tenantId = requireTenantContext();
      const tenantField = this.getTenantIdField();

      // Add tenant ID to criteria
      criteria = {
        ...criteria,
        [tenantField]: tenantId,
      };
    }

    return super.update(criteria, partialEntity);
  }

  /**
   * Delete with tenant scoping
   */
  async deleteWithTenantScope(criteria: any): Promise<any> {
    if (this.shouldScopeByTenant()) {
      const tenantId = requireTenantContext();
      const tenantField = this.getTenantIdField();

      // Add tenant ID to criteria
      criteria = {
        ...criteria,
        [tenantField]: tenantId,
      };
    }

    return super.delete(criteria);
  }

  /**
   * Create a query builder with tenant scoping
   */
  createTenantScopedQueryBuilder(alias: string): SelectQueryBuilder<T> {
    const queryBuilder = this.createQueryBuilder(alias);
    return this.applyTenantScope(queryBuilder);
  }

  /**
   * Find all entities for current tenant
   */
  async findAllForTenant(): Promise<T[]> {
    return this.findWithTenantScope();
  }

  /**
   * Find one entity by ID for current tenant
   */
  async findOneByIdForTenant(id: string): Promise<T | null> {
    return this.findOneByWithTenantScope({ id } as any);
  }

  /**
   * Check if entity exists for current tenant
   */
  async existsForTenant(id: string): Promise<boolean> {
    const count = await this.countWithTenantScope({ id } as any);
    return count > 0;
  }
}
