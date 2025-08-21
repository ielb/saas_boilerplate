import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';
import { Role } from './role.entity';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum InvitationType {
  TEAM_MEMBER = 'team_member',
  ADMIN = 'admin',
  VIEWER = 'viewer',
}

@Entity('invitations')
@Index(['email', 'tenantId'], { unique: true })
@Index(['token'], { unique: true })
@Index(['status', 'expiresAt'])
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({
    type: 'enum',
    enum: InvitationType,
    default: InvitationType.TEAM_MEMBER,
  })
  type!: InvitationType;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status!: InvitationStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  message!: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  invitedById!: string;

  @Column({ type: 'uuid', nullable: true })
  roleId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  acceptedById!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedById' })
  invitedBy!: User;

  @ManyToOne(() => Role, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'acceptedById' })
  acceptedBy!: User;

  // Business logic methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isPending(): boolean {
    return this.status === InvitationStatus.PENDING && !this.isExpired();
  }

  canBeAccepted(): boolean {
    return this.isPending();
  }

  canBeRevoked(): boolean {
    return this.status === InvitationStatus.PENDING;
  }

  accept(acceptedBy: User): void {
    if (!this.canBeAccepted()) {
      throw new Error('Invitation cannot be accepted');
    }
    this.status = InvitationStatus.ACCEPTED;
    this.acceptedAt = new Date();
    this.acceptedBy = acceptedBy;
  }

  revoke(): void {
    if (!this.canBeRevoked()) {
      throw new Error('Invitation cannot be revoked');
    }
    this.status = InvitationStatus.REVOKED;
    this.revokedAt = new Date();
  }

  markAsExpired(): void {
    if (this.status === InvitationStatus.PENDING) {
      this.status = InvitationStatus.EXPIRED;
    }
  }
}
