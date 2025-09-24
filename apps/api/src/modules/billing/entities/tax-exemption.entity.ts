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
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export enum TaxExemptionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum TaxExemptionType {
  NONPROFIT = 'nonprofit',
  GOVERNMENT = 'government',
  RESALE = 'resale',
  EXPORT = 'export',
  EDUCATIONAL = 'educational',
  RELIGIOUS = 'religious',
  MEDICAL = 'medical',
  CUSTOM = 'custom',
}

@Entity('tax_exemptions')
@Index(['tenantId', 'status'])
@Index(['customerId', 'status'])
@Index(['exemptionNumber'], { unique: true })
@Index(['status', 'expirationDate'])
export class TaxExemption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid', nullable: true })
  customerId?: string; // If exemption is customer-specific

  @Column({ type: 'varchar', length: 100, unique: true })
  exemptionNumber!: string; // Government-issued exemption number

  @Column({
    type: 'enum',
    enum: TaxExemptionType,
  })
  exemptionType!: TaxExemptionType;

  @Column({
    type: 'enum',
    enum: TaxExemptionStatus,
    default: TaxExemptionStatus.PENDING,
  })
  status!: TaxExemptionStatus;

  @Column({ type: 'varchar', length: 200 })
  organizationName!: string;

  @Column({ type: 'varchar', length: 2 })
  country!: string; // ISO 3166-1 alpha-2

  @Column({ type: 'varchar', length: 10, nullable: true })
  state?: string; // State/Province where exemption is valid

  @Column({ type: 'simple-array', nullable: true })
  jurisdictions?: string[]; // Specific jurisdictions where exemption applies

  @Column({ type: 'date' })
  issueDate!: Date;

  @Column({ type: 'date', nullable: true })
  expirationDate?: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  issuingAuthority?: string; // Government agency that issued exemption

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'simple-array', nullable: true })
  documentUrls?: string[]; // URLs to exemption certificate documents

  @Column({ type: 'jsonb', nullable: true })
  validationData?: {
    validatedAt?: Date;
    validatedBy?: string;
    validationMethod?: string;
    validationResult?: string;
    [key: string]: any;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    federalTaxId?: string;
    stateTaxId?: string;
    businessLicense?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    [key: string]: any;
  };

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer?: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  isValid(date: Date = new Date()): boolean {
    if (this.status !== TaxExemptionStatus.APPROVED) {
      return false;
    }

    const now = date;
    const issued = this.issueDate;
    const expiration = this.expirationDate;

    if (now < issued) {
      return false;
    }

    if (expiration && now > expiration) {
      return false;
    }

    return true;
  }

  isValidForJurisdiction(jurisdictionCode: string): boolean {
    if (!this.isValid()) {
      return false;
    }

    // If no specific jurisdictions are set, exemption applies to the country/state
    if (!this.jurisdictions || this.jurisdictions.length === 0) {
      const exemptionJurisdiction = this.state 
        ? `${this.country}_${this.state}` 
        : this.country;
      return jurisdictionCode.startsWith(exemptionJurisdiction);
    }

    return this.jurisdictions.includes(jurisdictionCode);
  }

  getDaysUntilExpiration(): number | null {
    if (!this.expirationDate) {
      return null;
    }

    const now = new Date();
    const expiration = this.expirationDate;
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  isExpiringSoon(daysThreshold: number = 30): boolean {
    const daysUntilExpiration = this.getDaysUntilExpiration();
    return daysUntilExpiration !== null && daysUntilExpiration <= daysThreshold;
  }
}
