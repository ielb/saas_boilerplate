import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BulkImportJob } from './bulk-import-job.entity';

@Entity('import_errors')
export class ImportError {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId!: string;

  @Column({ name: 'row_number', type: 'int' })
  rowNumber!: number;

  @Column({ name: 'field_name', type: 'varchar', length: 100, nullable: true })
  fieldName!: string;

  @Column({ name: 'error_message', type: 'text' })
  errorMessage!: string;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => BulkImportJob, job => job.errors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: BulkImportJob;
}
