import { Test, TestingModule } from '@nestjs/testing';
import { PdfGenerationService } from './pdf-generation.service';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceStatus, InvoiceType } from '@app/shared';
import { PaymentTerms, LineItemType } from '@app/shared';

describe('PdfGenerationService', () => {
  let service: PdfGenerationService;

  const mockInvoice: Partial<Invoice> = {
    id: 'invoice_123',
    invoiceNumber: 'INV-2024-01-0001',
    type: InvoiceType.SUBSCRIPTION,
    status: InvoiceStatus.DRAFT,
    tenantId: 'tenant_123',
    customerId: 'customer_123',
    billingAddress: {
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Acme Corp',
      addressLine1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
    },
    subtotal: 100,
    taxAmount: 10,
    discountAmount: 0,
    totalAmount: 110,
    amountPaid: 0,
    amountDue: 110,
    currency: 'USD',
    paymentTerms: PaymentTerms.NET_30,
    dueDate: new Date('2024-02-15'),
    issuedDate: new Date('2024-01-15'),
    notes: 'Thank you for your business!',
    footer: 'This is a test invoice footer.',
    createdAt: new Date(),
    updatedAt: new Date(),
    lineItems: [
      {
        id: 'line_item_123',
        invoiceId: 'invoice_123',
        type: LineItemType.SUBSCRIPTION,
        description: 'Monthly subscription',
        quantity: 1,
        unitPrice: 100,
        amount: 100,
        currency: 'USD',
        taxRate: 0.1,
        taxAmount: 10,
        discountAmount: 0,
        invoice: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    tenant: {
      id: 'tenant_123',
      name: 'Test Company',
      contactEmail: 'company@example.com',
      address: '456 Business Ave, Suite 100, New York, NY 10001',
    } as any,
    customer: {
      id: 'customer_123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'USER' as any,
      status: 'ACTIVE' as any,
      tenantId: 'tenant_123',
      authProvider: 'EMAIL' as any,
    } as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfGenerationService],
    }).compile();

    service = module.get<PdfGenerationService>(PdfGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateInvoicePdf', () => {
    it('should generate PDF buffer for invoice', async () => {
      // Act
      const result = await service.generateInvoicePdf(mockInvoice as Invoice);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    }, 15000);

    it('should handle invoice with minimal data', async () => {
      // Arrange
      const minimalInvoice = {
        ...mockInvoice,
        billingAddress: {
          name: 'Test User',
          email: 'test@example.com',
        },
        lineItems: [],
        tenant: null,
        customer: null,
        notes: undefined,
        footer: undefined,
      };

      // Act
      const result = await service.generateInvoicePdf(minimalInvoice as any);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('generateBillingReportPdf', () => {
    it('should generate PDF buffer for billing report', async () => {
      // Arrange
      const reportData = {
        totalRevenue: 10000,
        totalInvoices: 50,
        paidInvoices: 45,
        period: 'January 2024',
      };

      // Act
      const result = await service.generateBillingReportPdf(reportData);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    }, 15000);

    it('should handle empty report data', async () => {
      // Arrange
      const emptyReportData = {};

      // Act
      const result = await service.generateBillingReportPdf(emptyReportData);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    }, 15000);
  });
});
