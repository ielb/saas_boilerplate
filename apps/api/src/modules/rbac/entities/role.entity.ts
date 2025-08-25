import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Permission, PermissionScope } from './permission.entity';
import { User } from '../../users/entities/user.entity';

export enum RoleType {
  SYSTEM = 'system',
  CUSTOM = 'custom',
}

export enum RoleLevel {
  OWNER = 1,
  ADMIN = 2,
  MANAGER = 3,
  MEMBER = 4,
  VIEWER = 5,
}

@Entity('roles')
@Index(['name', 'tenantId'])
@Index(['level'])
@Index(['isSystem'])
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: RoleType,
    default: RoleType.CUSTOM,
  })
  type!: RoleType;

  @Column({
    type: 'enum',
    enum: RoleLevel,
    default: RoleLevel.VIEWER,
  })
  level!: RoleLevel;

  @Column({ type: 'uuid', nullable: true })
  tenantId?: string;

  @Column({ type: 'uuid', nullable: true })
  parentRoleId?: string;

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToMany(() => Permission, (permission: Permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions!: Permission[];

  @ManyToOne(() => Role, (role: Role) => role.childRoles, { nullable: true })
  @JoinColumn({ name: 'parentRoleId' })
  parentRole?: Role;

  @OneToMany(() => Role, role => role.parentRole)
  childRoles!: Role[];

  @ManyToMany(() => User, (user: User) => user.roles)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  users!: User[];

  isOwner(): boolean {
    return this.level === RoleLevel.OWNER;
  }

  isAdmin(): boolean {
    return this.level <= RoleLevel.ADMIN;
  }

  isManager(): boolean {
    return this.level <= RoleLevel.MANAGER;
  }

  isMember(): boolean {
    return this.level <= RoleLevel.MEMBER;
  }

  isViewer(): boolean {
    return this.level <= RoleLevel.VIEWER;
  }

  hasHigherLevelThan(role: Role): boolean {
    return this.level < role.level;
  }

  hasLowerLevelThan(role: Role): boolean {
    return this.level > role.level;
  }

  canManageRole(role: Role): boolean {
    return this.hasHigherLevelThan(role) || this.id === role.id;
  }

  getInheritedPermissions(): Permission[] {
    const inherited: Permission[] = [];

    if (this.parentRole) {
      inherited.push(...this.parentRole.permissions);
      inherited.push(...this.parentRole.getInheritedPermissions());
    }

    return inherited;
  }

  getAllPermissions(): Permission[] {
    const direct = this.permissions || [];
    const inherited = this.getInheritedPermissions();

    // Combine and deduplicate permissions
    const allPermissions = new Map<string, Permission>();

    [...direct, ...inherited].forEach((permission: Permission) => {
      const key = permission.getFullName();
      if (!allPermissions.has(key)) {
        allPermissions.set(key, permission);
      }
    });

    return Array.from(allPermissions.values());
  }

  hasPermission(resource: string, action: string): boolean {
    return this.getAllPermissions().some((permission: Permission) =>
      permission.matches(resource as any, action as any)
    );
  }

  hasPermissionInScope(
    resource: string,
    action: string,
    scope: PermissionScope
  ): boolean {
    return this.getAllPermissions().some(
      (permission: Permission) =>
        permission.matches(resource as any, action as any) &&
        permission.scope === scope
    );
  }
}
