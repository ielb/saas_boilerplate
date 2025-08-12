import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDate,
} from 'class-validator';

import { UserRole, MembershipStatus } from '@app/shared';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';
import { Permission } from './permission.entity';

@Entity('user_tenant_memberships')
@Index(['userId', 'tenantId'], { unique: true })
@Index(['userId'])
@Index(['tenantId'])
@Index(['status'])
@Index(['role'])
export class UserTenantMembership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @Column({ type: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.MEMBER })
  @IsEnum(UserRole)
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.ACTIVE,
  })
  @IsEnum(MembershipStatus)
  status!: MembershipStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @IsDate()
  joinedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDate()
  lastAccessedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  invitedBy?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  invitationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDate()
  invitationExpiresAt?: Date;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => User, user => user.tenantMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Tenant, tenant => tenant.userMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invitedBy' })
  inviter?: User;

  @ManyToMany(() => Permission, permission => permission.userMemberships)
  @JoinTable({
    name: 'user_membership_permissions',
    joinColumn: { name: 'membershipId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions!: Permission[];

  /**
   * Check if membership is currently active
   */
  get isActive(): boolean {
    return (
      this.status === MembershipStatus.ACTIVE &&
      (!this.expiresAt || this.expiresAt > new Date())
    );
  }

  /**
   * Check if membership has expired
   */
  get isExpired(): boolean {
    return (
      this.status === MembershipStatus.EXPIRED ||
      (!!this.expiresAt && this.expiresAt <= new Date())
    );
  }

  /**
   * Check if membership is pending invitation acceptance
   */
  get isPending(): boolean {
    return this.status === MembershipStatus.PENDING;
  }

  /**
   * Check if membership is suspended
   */
  get isSuspended(): boolean {
    return this.status === MembershipStatus.SUSPENDED;
  }

  /**
   * Update last accessed timestamp
   */
  updateLastAccessed(): void {
    this.lastAccessedAt = new Date();
  }

  /**
   * Activate membership (accept invitation)
   */
  activate(): void {
    this.status = MembershipStatus.ACTIVE;
    delete this.invitationToken;
    delete this.invitationExpiresAt;
  }

  /**
   * Suspend membership
   */
  suspend(): void {
    this.status = MembershipStatus.SUSPENDED;
  }

  /**
   * Expire membership
   */
  expire(): void {
    this.status = MembershipStatus.EXPIRED;
  }
}
