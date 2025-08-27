import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from './user.entity';
import { ImportError } from './import-error.entity';

export enum BulkImportJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('bulk_import_jobs')
export class BulkImportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @Column({
    type: 'enum',
    enum: BulkImportJobStatus,
    default: BulkImportJobStatus.PENDING,
  })
  status!: BulkImportJobStatus;

  @Column({ name: 'total_records', type: 'int', default: 0 })
  totalRecords!: number;

  @Column({ name: 'processed_records', type: 'int', default: 0 })
  processedRecords!: number;

  @Column({ name: 'successful_records', type: 'int', default: 0 })
  successfulRecords!: number;

  @Column({ name: 'failed_records', type: 'int', default: 0 })
  failedRecords!: number;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize!: number;

  @Column({ type: 'jsonb', nullable: true })
  options!: Record<string, any>;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User;

  @OneToMany(() => ImportError, error => error.job, { cascade: true })
  errors!: ImportError[];

  // Computed properties
  get progressPercentage(): number {
    if (this.totalRecords === 0) return 0;
    return Math.round((this.processedRecords / this.totalRecords) * 100);
  }

  get isCompleted(): boolean {
    return (
      this.status === BulkImportJobStatus.COMPLETED ||
      this.status === BulkImportJobStatus.FAILED
    );
  }

  get duration(): number | null {
    if (!this.startedAt) return null;
    const endTime = this.completedAt || new Date();
    return endTime.getTime() - this.startedAt.getTime();
  }
}
