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
import { InvoiceType } from '@app/shared';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('billing_templates')
@Index(['tenantId', 'type'])
@Index(['isDefault'])
export class BillingTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({
    type: 'enum',
    enum: InvoiceType,
  })
  type!: InvoiceType;

  @Column({ type: 'uuid', nullable: true })
  tenantId?: string;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'jsonb' })
  template!: {
    header?: string;
    footer?: string;
    styles?: Record<string, any>;
    layout?: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant?: Tenant;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

