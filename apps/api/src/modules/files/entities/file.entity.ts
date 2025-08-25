import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum FileStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  DELETED = 'deleted',
}

export enum FileVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  TENANT = 'tenant',
  TEAM = 'team',
}

/**
 * File entity for tracking uploaded files
 */
@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  key!: string;

  @Column({ type: 'varchar', length: 255 })
  originalName!: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType!: string;

  @Column({ type: 'bigint' })
  size!: number;

  @Column({ type: 'varchar', length: 50 })
  extension!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  path?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publicUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  storageProvider?: string;

  @Column({
    type: 'enum',
    enum: FileStatus,
    default: FileStatus.UPLOADING,
  })
  status!: FileStatus;

  @Column({
    type: 'enum',
    enum: FileVisibility,
    default: FileVisibility.PRIVATE,
  })
  visibility!: FileVisibility;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  virusScanResult?: {
    scanned: boolean;
    clean: boolean;
    threats: string[];
    scannedAt: Date;
  };

  @Column({ type: 'boolean', default: false })
  isVirusScanned!: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  uploadSessionId?: string;

  @Column({ type: 'uuid' })
  uploadedById!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy!: User;

  @Column({ type: 'uuid', nullable: true })
  tenantId?: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: Tenant;

  @Column({ type: 'jsonb', nullable: true })
  permissions?: {
    read: string[];
    write: string[];
    delete: string[];
  };

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
