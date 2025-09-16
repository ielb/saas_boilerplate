import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceService } from './invoice.service';
import { Invoice, InvoiceLineItem } from '../entities';
import { CreateInvoiceDto } from '../dto';
import { InvoiceStatus, InvoiceType } from '@app/shared';
import { PaymentTerms, LineItemType } from '@app/shared';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let invoiceRepository: Repository<Invoice>;
  let lineItemRepository: Repository<InvoiceLineItem>;

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
    },
    subtotal: 100,
    taxAmount: 10,
    discountAmount: 0,
    totalAmount: 110,
    amountPaid: 0,
    amountDue: 110,
    currency: 'USD',
    paymentTerms: PaymentTerms.NET_30,
    dueDate: new Date(),
    issuedDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLineItem: Partial<InvoiceLineItem> = {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: getRepositoryToken(Invoice),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InvoiceLineItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    invoiceRepository = module.get<Repository<Invoice>>(
      getRepositoryToken(Invoice)
    );
    lineItemRepository = module.get<Repository<InvoiceLineItem>>(
      getRepositoryToken(InvoiceLineItem)
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      // Arrange
      const createInvoiceDto: CreateInvoiceDto = {
        type: InvoiceType.SUBSCRIPTION,
        customerId: 'customer_123',
        billingAddress: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        lineItems: [
          {
            type: LineItemType.SUBSCRIPTION,
            description: 'Monthly subscription',
            quantity: 1,
            unitPrice: 100,
            taxRate: 0.1,
          },
        ],
        paymentTerms: PaymentTerms.NET_30,
      };

      const tenantId = 'tenant_123';

      jest
        .spyOn(invoiceRepository, 'create')
        .mockReturnValue(mockInvoice as Invoice);
      jest
        .spyOn(invoiceRepository, 'save')
        .mockResolvedValue(mockInvoice as Invoice);
      jest
        .spyOn(lineItemRepository, 'create')
        .mockReturnValue(mockLineItem as InvoiceLineItem);
      jest
        .spyOn(lineItemRepository, 'save')
        .mockResolvedValue(mockLineItem as InvoiceLineItem);
      jest.spyOn(service, 'findById').mockResolvedValue(mockInvoice as Invoice);

      // Act
      const result = await service.createInvoice(tenantId, createInvoiceDto);

      // Assert
      expect(result).toEqual(mockInvoice);
      expect(invoiceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          type: createInvoiceDto.type,
          customerId: createInvoiceDto.customerId,
          subtotal: 100,
          taxAmount: 10,
          totalAmount: 110,
        })
      );
    });
  });

  describe('findById', () => {
    it('should return an invoice when found', async () => {
      // Arrange
      const invoiceId = 'invoice_123';
      jest
        .spyOn(invoiceRepository, 'findOne')
        .mockResolvedValue(mockInvoice as Invoice);

      // Act
      const result = await service.findById(invoiceId);

      // Assert
      expect(result).toEqual(mockInvoice);
      expect(invoiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: invoiceId },
        relations: ['lineItems', 'customer', 'subscription', 'tenant'],
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      // Arrange
      const invoiceId = 'nonexistent';
      jest.spyOn(invoiceRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(invoiceId)).rejects.toThrow(
        'Invoice with ID nonexistent not found'
      );
    });
  });

  describe('markAsPaid', () => {
    it('should mark invoice as paid successfully', async () => {
      // Arrange
      const invoiceId = 'invoice_123';
      const tenantId = 'tenant_123';
      const amountPaid = 110;

      const mockInvoiceForTest = {
        ...mockInvoice,
        status: InvoiceStatus.DRAFT, // Ensure it's not already paid
        amountPaid: 0,
        amountDue: 110,
      };

      const updatedInvoice = {
        ...mockInvoiceForTest,
        amountPaid: 110,
        amountDue: 0,
        status: InvoiceStatus.PAID,
        paidDate: expect.any(Date),
      };

      jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce(mockInvoiceForTest as Invoice);
      jest
        .spyOn(invoiceRepository, 'save')
        .mockResolvedValue(updatedInvoice as Invoice);
      jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce(updatedInvoice as Invoice);

      // Act
      const result = await service.markAsPaid(invoiceId, tenantId, amountPaid);

      // Assert
      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(result.amountPaid).toBe(110);
      expect(result.amountDue).toBe(0);
    });

    it('should mark invoice as partially paid when amount is less than total', async () => {
      // Arrange
      const invoiceId = 'invoice_123';
      const tenantId = 'tenant_123';
      const amountPaid = 50;

      const mockInvoiceForTest = {
        ...mockInvoice,
        status: InvoiceStatus.DRAFT, // Ensure it's not already paid
        amountPaid: 0,
        amountDue: 110,
      };

      const updatedInvoice = {
        ...mockInvoiceForTest,
        amountPaid: 50,
        amountDue: 60,
        status: InvoiceStatus.PARTIALLY_PAID,
      };

      jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce(mockInvoiceForTest as Invoice);
      jest
        .spyOn(invoiceRepository, 'save')
        .mockResolvedValue(updatedInvoice as Invoice);
      jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce(updatedInvoice as Invoice);

      // Act
      const result = await service.markAsPaid(invoiceId, tenantId, amountPaid);

      // Assert
      expect(result.status).toBe(InvoiceStatus.PARTIALLY_PAID);
      expect(result.amountPaid).toBe(50);
      expect(result.amountDue).toBe(60);
    });
  });

  describe('voidInvoice', () => {
    it('should void an invoice successfully', async () => {
      // Arrange
      const invoiceId = 'invoice_123';
      const tenantId = 'tenant_123';

      const voidedInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.VOIDED,
        voidedDate: expect.any(Date),
      };

      jest.spyOn(service, 'findById').mockResolvedValue(mockInvoice as Invoice);
      jest
        .spyOn(invoiceRepository, 'save')
        .mockResolvedValue(voidedInvoice as Invoice);
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(voidedInvoice as Invoice);

      // Act
      const result = await service.voidInvoice(invoiceId, tenantId);

      // Assert
      expect(result.status).toBe(InvoiceStatus.VOIDED);
      expect(result.voidedDate).toBeDefined();
    });

    it('should throw BadRequestException when trying to void a paid invoice', async () => {
      // Arrange
      const invoiceId = 'invoice_123';
      const tenantId = 'tenant_123';
      const paidInvoice = { ...mockInvoice, status: InvoiceStatus.PAID };

      jest.spyOn(service, 'findById').mockResolvedValue(paidInvoice as Invoice);

      // Act & Assert
      await expect(service.voidInvoice(invoiceId, tenantId)).rejects.toThrow(
        'Cannot void a paid invoice'
      );
    });
  });
});
