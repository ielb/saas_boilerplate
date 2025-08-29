import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';

import { User } from '../../users/entities/user.entity';
import { Permission } from '../../rbac/entities/permission.entity';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';

export enum DelegationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  ACTIVE = 'active',
}

export enum DelegationType {
  PERMISSION_BASED = 'permission_based',
  ROLE_BASED = 'role_based',
  FULL_ACCESS = 'full_access',
}

@Entity('delegations')
@Index(['delegatorId', 'delegateId', 'tenantId'])
@Index(['status', 'tenantId'])
@Index(['expiresAt', 'tenantId'])
@Index(['delegationType', 'tenantId'])
export class Delegation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;

  @Column({ type: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  delegatorId!: string;

  @Column({ type: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  delegateId!: string;

  @Column({ type: 'uuid', nullable: true })
  @IsUUID()
  @IsOptional()
  approverId?: string;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty()
  title!: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  description?: string;

  @Column({
    type: 'enum',
    enum: DelegationType,
    default: DelegationType.PERMISSION_BASED,
  })
  @IsEnum(DelegationType)
  delegationType!: DelegationType;

  @Column({
    type: 'enum',
    enum: DelegationStatus,
    default: DelegationStatus.PENDING,
  })
  @IsEnum(DelegationStatus)
  status!: DelegationStatus;

  @Column({ type: 'timestamp' })
  @IsDateString()
  @IsNotEmpty()
  requestedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsDateString()
  @IsOptional()
  approvedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsDateString()
  @IsOptional()
  rejectedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsDateString()
  @IsOptional()
  revokedAt?: Date;

  @Column({ type: 'timestamp' })
  @IsDateString()
  @IsNotEmpty()
  expiresAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsDateString()
  @IsOptional()
  activatedAt?: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  approvalNotes?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  rejectionReason?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  revocationReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  requiresApproval!: boolean;

  @Column({ type: 'boolean', default: false })
  isEmergency!: boolean;

  @Column({ type: 'boolean', default: false })
  isRecurring!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  recurrencePattern?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'delegatorId' })
  delegator!: User;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'delegateId' })
  delegate!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approverId' })
  approver?: User;

  @ManyToMany(() => Permission)
  @JoinTable({
    name: 'delegation_permissions',
    joinColumn: { name: 'delegationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions!: Permission[];

  @OneToMany(() => DelegationAuditLog, auditLog => auditLog.delegation)
  auditLogs!: DelegationAuditLog[];

  // Business logic methods
  isActive(): boolean {
    return (
      this.status === DelegationStatus.ACTIVE && this.expiresAt > new Date()
    );
  }

  isExpired(): boolean {
    return this.expiresAt <= new Date();
  }

  isPending(): boolean {
    return this.status === DelegationStatus.PENDING;
  }

  isApproved(): boolean {
    return this.status === DelegationStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.status === DelegationStatus.REJECTED;
  }

  isRevoked(): boolean {
    return this.status === DelegationStatus.REVOKED;
  }

  canBeActivated(): boolean {
    return this.isApproved() && !this.isExpired() && !this.isRevoked();
  }

  canBeRevoked(): boolean {
    return this.isActive() || this.isApproved();
  }

  getDurationInHours(): number {
    const duration = this.expiresAt.getTime() - this.requestedAt.getTime();
    return Math.ceil(duration / (1000 * 60 * 60));
  }

  getRemainingTimeInHours(): number {
    if (this.isExpired()) return 0;
    const remaining = this.expiresAt.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60)));
  }

  hasPermission(permissionId: string): boolean {
    return this.permissions.some(permission => permission.id === permissionId);
  }

  getPermissionNames(): string[] {
    return this.permissions.map(permission => permission.getFullName());
  }
}

@Entity('delegation_audit_logs')
@Index(['delegationId', 'tenantId'])
@Index(['action', 'tenantId'])
@Index(['createdAt', 'tenantId'])
export class DelegationAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;

  @Column({ type: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  delegationId!: string;

  @Column({ type: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  action!: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  details?: string;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  @IsOptional()
  ipAddress?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  userAgent?: string;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Delegation, { nullable: false })
  @JoinColumn({ name: 'delegationId' })
  delegation!: Delegation;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: User;
}

// Custom repository for delegation
export class DelegationRepository extends TenantScopedRepository<Delegation> {
  protected getTenantIdField(): string {
    return 'tenantId';
  }
  async findActiveDelegationsForUser(
    userId: string,
    tenantId: string
  ): Promise<Delegation[]> {
    return this.createQueryBuilder('delegation')
      .leftJoinAndSelect('delegation.permissions', 'permissions')
      .leftJoinAndSelect('delegation.delegator', 'delegator')
      .leftJoinAndSelect('delegation.delegate', 'delegate')
      .where('delegation.delegateId = :userId', { userId })
      .andWhere('delegation.tenantId = :tenantId', { tenantId })
      .andWhere('delegation.status = :status', {
        status: DelegationStatus.ACTIVE,
      })
      .andWhere('delegation.expiresAt > :now', { now: new Date() })
      .getMany();
  }

  async findPendingApprovalsForUser(
    userId: string,
    tenantId: string
  ): Promise<Delegation[]> {
    return this.createQueryBuilder('delegation')
      .leftJoinAndSelect('delegation.permissions', 'permissions')
      .leftJoinAndSelect('delegation.delegator', 'delegator')
      .leftJoinAndSelect('delegation.delegate', 'delegate')
      .where('delegation.approverId = :userId', { userId })
      .andWhere('delegation.tenantId = :tenantId', { tenantId })
      .andWhere('delegation.status = :status', {
        status: DelegationStatus.PENDING,
      })
      .andWhere('delegation.expiresAt > :now', { now: new Date() })
      .getMany();
  }

  async findExpiredDelegations(): Promise<Delegation[]> {
    return this.createQueryBuilder('delegation')
      .where('delegation.status IN (:...statuses)', {
        statuses: [DelegationStatus.ACTIVE, DelegationStatus.APPROVED],
      })
      .andWhere('delegation.expiresAt <= :now', { now: new Date() })
      .getMany();
  }

  async findDelegationsByDelegator(
    delegatorId: string,
    tenantId: string
  ): Promise<Delegation[]> {
    return this.createQueryBuilder('delegation')
      .leftJoinAndSelect('delegation.permissions', 'permissions')
      .leftJoinAndSelect('delegation.delegate', 'delegate')
      .leftJoinAndSelect('delegation.approver', 'approver')
      .where('delegation.delegatorId = :delegatorId', { delegatorId })
      .andWhere('delegation.tenantId = :tenantId', { tenantId })
      .orderBy('delegation.createdAt', 'DESC')
      .getMany();
  }

  async findDelegationsByDelegate(
    delegateId: string,
    tenantId: string
  ): Promise<Delegation[]> {
    return this.createQueryBuilder('delegation')
      .leftJoinAndSelect('delegation.permissions', 'permissions')
      .leftJoinAndSelect('delegation.delegator', 'delegator')
      .leftJoinAndSelect('delegation.approver', 'approver')
      .where('delegation.delegateId = :delegateId', { delegateId })
      .andWhere('delegation.tenantId = :tenantId', { tenantId })
      .orderBy('delegation.createdAt', 'DESC')
      .getMany();
  }
}
