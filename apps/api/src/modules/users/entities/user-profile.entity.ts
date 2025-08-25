import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum ProfilePrivacyLevel {
  PUBLIC = 'public',
  TENANT_ONLY = 'tenant_only',
  PRIVATE = 'private',
}

export enum ProfileCompletionStatus {
  INCOMPLETE = 'incomplete',
  BASIC = 'basic',
  COMPLETE = 'complete',
}

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarFileKey?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  jobTitle?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  linkedinUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  twitterUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  githubUrl?: string;

  @Column({
    type: 'enum',
    enum: ProfilePrivacyLevel,
    default: ProfilePrivacyLevel.TENANT_ONLY,
  })
  privacyLevel!: ProfilePrivacyLevel;

  @Column({
    type: 'enum',
    enum: ProfileCompletionStatus,
    default: ProfileCompletionStatus.INCOMPLETE,
  })
  completionStatus!: ProfileCompletionStatus;

  @Column({ type: 'jsonb', nullable: true })
  preferences?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: Tenant;
}
