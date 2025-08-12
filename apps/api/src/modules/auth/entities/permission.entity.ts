import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
} from 'typeorm';

import { UserTenantMembership } from './user-tenant-membership.entity';

export enum PermissionScope {
  GLOBAL = 'global',
  TENANT = 'tenant',
  TEAM = 'team',
  USER = 'user',
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  APPROVE = 'approve',
  REJECT = 'reject',
  EXPORT = 'export',
  IMPORT = 'import',
  ASSIGN = 'assign',
  REVOKE = 'revoke',
}

export enum PermissionResource {
  USERS = 'users',
  ROLES = 'roles',
  PERMISSIONS = 'permissions',
  TENANTS = 'tenants',
  TEAMS = 'teams',
  SESSIONS = 'sessions',
  BILLING = 'billing',
  SUBSCRIPTIONS = 'subscriptions',
  INVOICES = 'invoices',
  PAYMENTS = 'payments',
  FILES = 'files',
  DOCUMENTS = 'documents',
  NOTIFICATIONS = 'notifications',
  EMAILS = 'emails',
  REPORTS = 'reports',
  ANALYTICS = 'analytics',
  AUDIT_LOGS = 'audit_logs',
  SYSTEM_SETTINGS = 'system_settings',
  FEATURE_FLAGS = 'feature_flags',
  API_KEYS = 'api_keys',
  WEBHOOKS = 'webhooks',
}

@Entity('permissions')
@Index(['resource', 'action', 'scope'])
@Index(['scope'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PermissionResource,
    nullable: false,
  })
  resource!: PermissionResource;

  @Column({
    type: 'enum',
    enum: PermissionAction,
    nullable: false,
  })
  action!: PermissionAction;

  @Column({
    type: 'enum',
    enum: PermissionScope,
    default: PermissionScope.TENANT,
  })
  scope!: PermissionScope;

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  conditions?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToMany('Role', (role: any) => role.permissions)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'permissionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles!: any[];

  @ManyToMany(() => UserTenantMembership, membership => membership.permissions)
  userMemberships!: UserTenantMembership[];

  getFullName(): string {
    return `${this.resource}:${this.action}`;
  }

  isGlobal(): boolean {
    return this.scope === PermissionScope.GLOBAL;
  }

  isTenantScoped(): boolean {
    return this.scope === PermissionScope.TENANT;
  }

  isTeamScoped(): boolean {
    return this.scope === PermissionScope.TEAM;
  }

  isUserScoped(): boolean {
    return this.scope === PermissionScope.USER;
  }

  matches(resource: PermissionResource, action: PermissionAction): boolean {
    return this.resource === resource && this.action === action;
  }

  hasCondition(key: string): boolean {
    return !!(this.conditions && key in this.conditions);
  }

  getCondition(key: string): any {
    return this.conditions?.[key];
  }
}
