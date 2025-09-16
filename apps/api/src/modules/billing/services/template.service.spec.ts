import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from './template.service';
import { Invoice } from '../entities/invoice.entity';
import { BillingTemplate } from '../entities/billing-template.entity';
import { InvoiceStatus, InvoiceType } from '@app/shared';
import { PaymentTerms, LineItemType } from '@app/shared';

describe('TemplateService', () => {
  let service: TemplateService;

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

  const mockTemplate: Partial<BillingTemplate> = {
    id: 'template_123',
    name: 'Custom Invoice Template',
    type: InvoiceType.SUBSCRIPTION,
    template: {
      header: `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Custom Template for {{invoice.invoiceNumber}}</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `,
      footer: 'Custom footer',
      styles: {},
      layout: {},
    },
    metadata: {
      emailContent: `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Custom Email for {{invoice.invoiceNumber}}</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateService],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateInvoiceHtml', () => {
    it('should generate HTML from default template', async () => {
      // Act
      const result = await service.generateInvoiceHtml(mockInvoice as Invoice);

      // Assert
      expect(result).toContain('<!doctype html>');
      expect(result).toContain('INV-2024-01-0001');
      expect(result).toContain('Test Company');
      expect(result).toContain('John Doe');
      expect(result).toContain('$110.00');
    });

    it('should generate HTML from custom template', async () => {
      // Act
      const result = await service.generateInvoiceHtml(
        mockInvoice as Invoice,
        mockTemplate as BillingTemplate
      );

      // Assert
      expect(result).toContain('<!doctype html>');
      expect(result).toContain('Custom Template for INV-2024-01-0001');
    });

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
      const result = await service.generateInvoiceHtml(minimalInvoice as any);

      // Assert
      expect(result).toContain('<!doctype html>');
      expect(result).toContain('INV-2024-01-0001');
    });
  });

  describe('generateEmailHtml', () => {
    it('should generate email HTML from default template', async () => {
      // Act
      const result = await service.generateEmailHtml(mockInvoice as Invoice);

      // Assert
      expect(result).toContain('<!doctype html>');
      expect(result).toContain('Invoice Payment Due');
      expect(result).toContain('INV-2024-01-0001');
      expect(result).toContain('$110.00');
    });

    it('should generate email HTML from custom template', async () => {
      // Act
      const result = await service.generateEmailHtml(
        mockInvoice as Invoice,
        mockTemplate as BillingTemplate
      );

      // Assert
      expect(result).toContain('<!doctype html>');
      expect(result).toContain('Custom Email for INV-2024-01-0001');
    });
  });
});
