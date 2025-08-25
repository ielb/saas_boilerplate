import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../rbac/entities/role.entity';

export enum TeamStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Entity('teams')
@Index(['tenantId', 'name'])
@Unique(['tenantId', 'name'])
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  managerId?: string;

  @Column({ type: 'enum', enum: TeamStatus, default: TeamStatus.ACTIVE })
  status!: TeamStatus;

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'managerId' })
  manager?: User;

  @OneToMany(() => TeamMembership, membership => membership.team)
  memberships?: TeamMembership[];
}

@Entity('team_memberships')
@Index(['teamId', 'userId'])
@Unique(['teamId', 'userId'])
export class TeamMembership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  teamId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  roleId!: string;

  @Column({ type: 'uuid', nullable: true })
  invitedById?: string;

  @Column({ type: 'enum', enum: TeamStatus, default: TeamStatus.ACTIVE })
  status!: TeamStatus;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  invitedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => Team, team => team.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team!: Team;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invitedById' })
  invitedBy?: User;
}

@Entity('team_invitations')
@Index(['teamId', 'email'])
@Unique(['teamId', 'email'])
export class TeamInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  teamId!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'uuid' })
  roleId!: string;

  @Column({ type: 'uuid' })
  invitedById!: string;

  @Column({ type: 'varchar', length: 255 })
  token!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    default: 'pending',
  })
  status!: 'pending' | 'accepted' | 'expired' | 'cancelled';

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt?: Date;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team!: Team;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invitedById' })
  invitedBy!: User;
}
