import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingHistoryService } from './billing-history.service';
import { BillingHistory } from '../entities';
import { BillingStatus, BillingType } from '@app/shared';

describe('BillingHistoryService', () => {
  let service: BillingHistoryService;
  let billingHistoryRepository: Repository<BillingHistory>;

  const mockBillingHistory: Partial<BillingHistory> = {
    id: 'history_123',
    tenantId: 'tenant_123',
    type: BillingType.SUBSCRIPTION,
    description: 'Monthly subscription payment',
    amount: 100,
    currency: 'USD',
    status: BillingStatus.PENDING,
    referenceId: 'invoice_123',
    referenceType: 'invoice',
    invoiceId: 'invoice_123',
    subscriptionId: 'subscription_123',
    metadata: {
      period: '2024-01',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingHistoryService,
        {
          provide: getRepositoryToken(BillingHistory),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(),
              select: jest.fn().mockReturnThis(),
              getRawOne: jest.fn(),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<BillingHistoryService>(BillingHistoryService);
    billingHistoryRepository = module.get<Repository<BillingHistory>>(
      getRepositoryToken(BillingHistory)
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBillingHistory', () => {
    it('should create billing history successfully', async () => {
      // Arrange
      const tenantId = 'tenant_123';
      const createData = {
        type: BillingType.SUBSCRIPTION,
        description: 'Monthly subscription payment',
        amount: 100,
        currency: 'USD',
        referenceId: 'invoice_123',
        referenceType: 'invoice',
        invoiceId: 'invoice_123',
        subscriptionId: 'subscription_123',
        metadata: { period: '2024-01' },
      };

      jest
        .spyOn(billingHistoryRepository, 'create')
        .mockReturnValue(mockBillingHistory as BillingHistory);
      jest
        .spyOn(billingHistoryRepository, 'save')
        .mockResolvedValue(mockBillingHistory as BillingHistory);

      // Act
      const result = await service.createBillingHistory(tenantId, createData);

      // Assert
      expect(result).toEqual(mockBillingHistory);
      expect(billingHistoryRepository.create).toHaveBeenCalledWith({
        ...createData,
        tenantId,
        status: BillingStatus.PENDING,
      });
      expect(billingHistoryRepository.save).toHaveBeenCalledWith(
        mockBillingHistory
      );
    });

    it('should create billing history with custom status', async () => {
      // Arrange
      const tenantId = 'tenant_123';
      const createData = {
        type: BillingType.SUBSCRIPTION,
        description: 'Monthly subscription payment',
        amount: 100,
        currency: 'USD',
        status: BillingStatus.PAID,
      };

      const mockHistoryWithStatus = {
        ...mockBillingHistory,
        status: BillingStatus.PAID,
      };

      jest
        .spyOn(billingHistoryRepository, 'create')
        .mockReturnValue(mockHistoryWithStatus as BillingHistory);
      jest
        .spyOn(billingHistoryRepository, 'save')
        .mockResolvedValue(mockHistoryWithStatus as BillingHistory);

      // Act
      const result = await service.createBillingHistory(tenantId, createData);

      // Assert
      expect(result.status).toBe(BillingStatus.PAID);
      expect(billingHistoryRepository.create).toHaveBeenCalledWith({
        ...createData,
        tenantId,
      });
    });
  });

  describe('getBillingHistoryByTenant', () => {
    it('should return billing history for tenant', async () => {
      // Arrange
      const tenantId = 'tenant_123';
      const mockHistory = [mockBillingHistory as BillingHistory];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockHistory, 1]),
      };

      jest
        .spyOn(billingHistoryRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getBillingHistoryByTenant(tenantId);

      // Assert
      expect(result.history).toEqual(mockHistory);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'history.tenantId = :tenantId',
        { tenantId }
      );
    });

    it('should apply filters when provided', async () => {
      // Arrange
      const tenantId = 'tenant_123';
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        type: BillingType.SUBSCRIPTION,
        status: BillingStatus.PENDING,
        limit: 10,
        offset: 0,
      };
      const mockHistory = [mockBillingHistory as BillingHistory];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockHistory, 1]),
      };

      jest
        .spyOn(billingHistoryRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getBillingHistoryByTenant(tenantId, options);

      // Assert
      expect(result.history).toEqual(mockHistory);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'history.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: options.startDate,
          endDate: options.endDate,
        }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'history.type = :type',
        { type: options.type }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'history.status = :status',
        { status: options.status }
      );
    });
  });

  describe('getBillingHistoryBySubscription', () => {
    it('should return billing history for subscription', async () => {
      // Arrange
      const subscriptionId = 'subscription_123';
      const mockHistory = [mockBillingHistory as BillingHistory];

      jest
        .spyOn(billingHistoryRepository, 'find')
        .mockResolvedValue(mockHistory);

      // Act
      const result =
        await service.getBillingHistoryBySubscription(subscriptionId);

      // Assert
      expect(result).toEqual(mockHistory);
      expect(billingHistoryRepository.find).toHaveBeenCalledWith({
        where: { subscriptionId },
        relations: ['invoice', 'payment', 'subscription'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getBillingHistoryByInvoice', () => {
    it('should return billing history for invoice', async () => {
      // Arrange
      const invoiceId = 'invoice_123';
      const mockHistory = [mockBillingHistory as BillingHistory];

      jest
        .spyOn(billingHistoryRepository, 'find')
        .mockResolvedValue(mockHistory);

      // Act
      const result = await service.getBillingHistoryByInvoice(invoiceId);

      // Assert
      expect(result).toEqual(mockHistory);
      expect(billingHistoryRepository.find).toHaveBeenCalledWith({
        where: { invoiceId },
        relations: ['invoice', 'payment', 'subscription'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('updateBillingHistoryStatus', () => {
    it('should update billing history status successfully', async () => {
      // Arrange
      const id = 'history_123';
      const newStatus = BillingStatus.PAID;
      const processedAt = new Date();
      const updatedHistory = {
        ...mockBillingHistory,
        status: newStatus,
        processedAt,
      };

      jest
        .spyOn(billingHistoryRepository, 'findOne')
        .mockResolvedValue(mockBillingHistory as BillingHistory);
      jest
        .spyOn(billingHistoryRepository, 'save')
        .mockResolvedValue(updatedHistory as BillingHistory);

      // Act
      const result = await service.updateBillingHistoryStatus(
        id,
        newStatus,
        processedAt
      );

      // Assert
      expect(result.status).toBe(newStatus);
      expect(result.processedAt).toBe(processedAt);
      expect(billingHistoryRepository.save).toHaveBeenCalledWith({
        ...mockBillingHistory,
        status: newStatus,
        processedAt,
      });
    });

    it('should throw error when history not found', async () => {
      // Arrange
      const id = 'nonexistent';
      jest.spyOn(billingHistoryRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateBillingHistoryStatus(id, BillingStatus.PAID)
      ).rejects.toThrow('Billing history with ID nonexistent not found');
    });
  });

  describe('getBillingSummary', () => {
    it('should return billing summary', async () => {
      // Arrange
      const tenantId = 'tenant_123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '1000' }),
      };

      jest
        .spyOn(billingHistoryRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(billingHistoryRepository, 'count').mockResolvedValue(10);

      // Act
      const result = await service.getBillingSummary(
        tenantId,
        startDate,
        endDate
      );

      // Assert
      expect(result.totalRevenue).toBe(1000);
      expect(result.totalExpenses).toBe(1000);
      expect(result.netRevenue).toBe(0);
      expect(result.transactionCount).toBe(10);
      expect(result.averageTransactionAmount).toBe(200);
    });
  });

  describe('recordInvoicePayment', () => {
    it('should record invoice payment', async () => {
      // Arrange
      const invoiceId = 'invoice_123';
      const paymentId = 'payment_123';
      const amount = 100;
      const currency = 'USD';
      const mockPaymentHistory = {
        ...mockBillingHistory,
        type: BillingType.SUBSCRIPTION,
        description: 'Invoice payment received',
        amount,
        currency,
        referenceId: paymentId,
        referenceType: 'payment',
        invoiceId,
        paymentId,
      };

      jest
        .spyOn(billingHistoryRepository, 'create')
        .mockReturnValue(mockPaymentHistory as BillingHistory);
      jest
        .spyOn(billingHistoryRepository, 'save')
        .mockResolvedValue(mockPaymentHistory as BillingHistory);

      // Act
      const result = await service.recordInvoicePayment(
        invoiceId,
        paymentId,
        amount,
        currency
      );

      // Assert
      expect(result.type).toBe(BillingType.SUBSCRIPTION);
      expect(result.description).toBe('Invoice payment received');
      expect(result.amount).toBe(amount);
      expect(result.currency).toBe(currency);
      expect(result.referenceId).toBe(paymentId);
      expect(result.invoiceId).toBe(invoiceId);
      expect(result.paymentId).toBe(paymentId);
    });
  });

  describe('recordRefund', () => {
    it('should record refund', async () => {
      // Arrange
      const invoiceId = 'invoice_123';
      const amount = 50;
      const currency = 'USD';
      const reason = 'Customer request';
      const mockRefundHistory = {
        ...mockBillingHistory,
        type: BillingType.REFUND,
        description: 'Refund processed: Customer request',
        amount: -amount,
        currency,
        referenceId: invoiceId,
        referenceType: 'invoice',
        invoiceId,
      };

      jest
        .spyOn(billingHistoryRepository, 'create')
        .mockReturnValue(mockRefundHistory as BillingHistory);
      jest
        .spyOn(billingHistoryRepository, 'save')
        .mockResolvedValue(mockRefundHistory as BillingHistory);

      // Act
      const result = await service.recordRefund(
        invoiceId,
        amount,
        currency,
        reason
      );

      // Assert
      expect(result.type).toBe(BillingType.REFUND);
      expect(result.description).toBe('Refund processed: Customer request');
      expect(result.amount).toBe(-amount);
      expect(result.currency).toBe(currency);
      expect(result.referenceId).toBe(invoiceId);
      expect(result.invoiceId).toBe(invoiceId);
    });
  });

  describe('recordAdjustment', () => {
    it('should record adjustment', async () => {
      // Arrange
      const tenantId = 'tenant_123';
      const amount = 25;
      const currency = 'USD';
      const description = 'Credit adjustment';
      const metadata = { reason: 'Service credit' };
      const mockAdjustmentHistory = {
        ...mockBillingHistory,
        type: BillingType.ADJUSTMENT,
        description,
        amount,
        currency,
        metadata,
      };

      jest
        .spyOn(billingHistoryRepository, 'create')
        .mockReturnValue(mockAdjustmentHistory as BillingHistory);
      jest
        .spyOn(billingHistoryRepository, 'save')
        .mockResolvedValue(mockAdjustmentHistory as BillingHistory);

      // Act
      const result = await service.recordAdjustment(
        tenantId,
        amount,
        currency,
        description,
        metadata
      );

      // Assert
      expect(result.type).toBe(BillingType.ADJUSTMENT);
      expect(result.description).toBe(description);
      expect(result.amount).toBe(amount);
      expect(result.currency).toBe(currency);
      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('deleteBillingHistory', () => {
    it('should delete billing history successfully', async () => {
      // Arrange
      const id = 'history_123';
      jest
        .spyOn(billingHistoryRepository, 'findOne')
        .mockResolvedValue(mockBillingHistory as BillingHistory);
      jest
        .spyOn(billingHistoryRepository, 'remove')
        .mockResolvedValue(mockBillingHistory as BillingHistory);

      // Act
      await service.deleteBillingHistory(id);

      // Assert
      expect(billingHistoryRepository.remove).toHaveBeenCalledWith(
        mockBillingHistory
      );
    });

    it('should throw error when history not found', async () => {
      // Arrange
      const id = 'nonexistent';
      jest.spyOn(billingHistoryRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteBillingHistory(id)).rejects.toThrow(
        'Billing history with ID nonexistent not found'
      );
    });
  });
});
