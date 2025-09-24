import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TaxType } from '@app/shared';

@Entity('tax_rates')
@Index(['country', 'state', 'enabled'])
@Index(['taxType', 'enabled'])
@Index(['jurisdictionCode'], { unique: true })
export class TaxRate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  jurisdictionCode!: string; // e.g., 'US_CA', 'EU_DE'

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 2 })
  country!: string; // ISO 3166-1 alpha-2

  @Column({ type: 'varchar', length: 10, nullable: true })
  state?: string; // State/Province code

  @Column({ type: 'varchar', length: 50, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode?: string;

  @Column({
    type: 'enum',
    enum: TaxType,
    default: TaxType.SALES_TAX,
  })
  taxType!: TaxType;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  rate!: number; // Tax rate as decimal (0.08 for 8%)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  threshold?: number; // Minimum amount before tax applies

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'date', nullable: true })
  effectiveDate?: Date;

  @Column({ type: 'date', nullable: true })
  expirationDate?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    displayName?: string;
    authority?: string; // Tax authority name
    registrationNumber?: string;
    compoundTax?: boolean; // If tax is calculated on tax-inclusive amount
    reverseCharge?: boolean; // For B2B transactions in EU
    digitalServices?: boolean; // Special rules for digital services
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  calculateTax(amount: number): number {
    if (!this.enabled || (this.threshold && amount < this.threshold)) {
      return 0;
    }
    return amount * this.rate;
  }

  isValidForDate(date: Date = new Date()): boolean {
    const now = date;
    const effective = this.effectiveDate || new Date('1900-01-01');
    const expiration = this.expirationDate || new Date('2099-12-31');
    
    return now >= effective && now <= expiration;
  }

  getDisplayRate(): string {
    return `${(this.rate * 100).toFixed(2)}%`;
  }
}
