import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageBillingService } from './usage-billing.service';
import { UsageBilling, UsageBillingRecord } from '../entities';
import { SubscriptionUsage } from '../../subscriptions/entities/subscription-usage.entity';
import { BillingStatus, UsageMetricType } from '@app/shared';

describe('UsageBillingService', () => {
  let service: UsageBillingService;
  let usageBillingRepository: Repository<UsageBilling>;
  let usageBillingRecordRepository: Repository<UsageBillingRecord>;
  let subscriptionUsageRepository: Repository<SubscriptionUsage>;

  const mockUsageBilling: Partial<UsageBilling> = {
    id: 'usage_billing_123',
    tenantId: 'tenant_123',
    subscriptionId: 'subscription_123',
    billingPeriod: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    },
    subtotal: 100,
    taxAmount: 10,
    totalAmount: 110,
    currency: 'USD',
    status: BillingStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsageBillingRecord: Partial<UsageBillingRecord> = {
    id: 'record_123',
    usageBillingId: 'usage_billing_123',
    metricType: UsageMetricType.API_CALLS,
    metricName: 'API Calls',
    quantity: 1000,
    unitPrice: 0.1,
    amount: 100,
    currency: 'USD',
    metadata: {
      recordCount: 10,
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubscriptionUsage: Partial<SubscriptionUsage> = {
    id: 'usage_123',
    subscriptionId: 'subscription_123',
    metricType: UsageMetricType.API_CALLS,
    metricName: 'API Calls',
    quantity: 100,
    unitPrice: 0.1,
    recordedAt: new Date('2024-01-15'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageBillingService,
        {
          provide: getRepositoryToken(UsageBilling),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
            count: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UsageBillingRecord),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SubscriptionUsage),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsageBillingService>(UsageBillingService);
    usageBillingRepository = module.get<Repository<UsageBilling>>(
      getRepositoryToken(UsageBilling)
    );
    usageBillingRecordRepository = module.get<Repository<UsageBillingRecord>>(
      getRepositoryToken(UsageBillingRecord)
    );
    subscriptionUsageRepository = module.get<Repository<SubscriptionUsage>>(
      getRepositoryToken(SubscriptionUsage)
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUsageBilling', () => {
    it('should create usage billing successfully', async () => {
      // Arrange
      const tenantId = 'tenant_123';
      const subscriptionId = 'subscription_123';
      const billingPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const mockUsageRecords = [mockSubscriptionUsage as SubscriptionUsage];
      const mockCreatedUsageBilling = {
        ...mockUsageBilling,
        id: 'new_usage_billing',
      };
      const mockCreatedRecord = { ...mockUsageBillingRecord, id: 'new_record' };

      jest
        .spyOn(subscriptionUsageRepository, 'find')
        .mockResolvedValue(mockUsageRecords);
      jest
        .spyOn(usageBillingRepository, 'create')
        .mockReturnValue(mockCreatedUsageBilling as UsageBilling);
      jest
        .spyOn(usageBillingRepository, 'save')
        .mockResolvedValueOnce(mockCreatedUsageBilling as UsageBilling);
      jest
        .spyOn(usageBillingRecordRepository, 'create')
        .mockReturnValue(mockCreatedRecord as UsageBillingRecord);
      jest
        .spyOn(usageBillingRecordRepository, 'save')
        .mockResolvedValue(mockCreatedRecord as UsageBillingRecord);
      jest.spyOn(usageBillingRepository, 'save').mockResolvedValueOnce({
        ...mockCreatedUsageBilling,
        subtotal: 10,
        taxAmount: 1,
        totalAmount: 11,
      } as UsageBilling);

      // Act
      const result = await service.createUsageBilling(
        tenantId,
        subscriptionId,
        billingPeriod
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.subtotal).toBe(10);
      expect(result.taxAmount).toBe(1);
      expect(result.totalAmount).toBe(11);
      expect(subscriptionUsageRepository.find).toHaveBeenCalledWith({
        where: {
          subscriptionId,
          recordedAt: expect.any(Object),
        },
      });
    });

    it('should throw error when no usage records found', async () => {
      // Arrange
      const tenantId = 'tenant_123';
      const subscriptionId = 'subscription_123';
      const billingPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      jest.spyOn(subscriptionUsageRepository, 'find').mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.createUsageBilling(tenantId, subscriptionId, billingPeriod)
      ).rejects.toThrow('No usage records found for the specified period');
    });
  });

  describe('getUsageBillingById', () => {
    it('should return usage billing when found', async () => {
      // Arrange
      const id = 'usage_billing_123';
      jest
        .spyOn(usageBillingRepository, 'findOne')
        .mockResolvedValue(mockUsageBilling as UsageBilling);

      // Act
      const result = await service.getUsageBillingById(id);

      // Assert
      expect(result).toEqual(mockUsageBilling);
      expect(usageBillingRepository.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['usageRecords', 'subscription', 'tenant', 'invoice'],
      });
    });

    it('should throw error when usage billing not found', async () => {
      // Arrange
      const id = 'nonexistent';
      jest.spyOn(usageBillingRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUsageBillingById(id)).rejects.toThrow(
        'Usage billing with ID nonexistent not found'
      );
    });
  });

  describe('getUsageBillingBySubscription', () => {
    it('should return usage billing records for subscription', async () => {
      // Arrange
      const subscriptionId = 'subscription_123';
      const limit = 10;
      const mockUsageBillings = [mockUsageBilling as UsageBilling];

      jest
        .spyOn(usageBillingRepository, 'find')
        .mockResolvedValue(mockUsageBillings);

      // Act
      const result = await service.getUsageBillingBySubscription(
        subscriptionId,
        limit
      );

      // Assert
      expect(result).toEqual(mockUsageBillings);
      expect(usageBillingRepository.find).toHaveBeenCalledWith({
        where: { subscriptionId },
        relations: ['usageRecords', 'invoice'],
        order: { createdAt: 'DESC' },
        take: limit,
      });
    });
  });

  describe('updateUsageBillingStatus', () => {
    it('should update usage billing status successfully', async () => {
      // Arrange
      const id = 'usage_billing_123';
      const newStatus = BillingStatus.PAID;
      const updatedUsageBilling = { ...mockUsageBilling, status: newStatus };

      jest
        .spyOn(service, 'getUsageBillingById')
        .mockResolvedValue(mockUsageBilling as UsageBilling);
      jest
        .spyOn(usageBillingRepository, 'save')
        .mockResolvedValue(updatedUsageBilling as UsageBilling);

      // Act
      const result = await service.updateUsageBillingStatus(id, newStatus);

      // Assert
      expect(result.status).toBe(newStatus);
      expect(usageBillingRepository.save).toHaveBeenCalledWith({
        ...mockUsageBilling,
        status: newStatus,
      });
    });
  });

  describe('linkToInvoice', () => {
    it('should link usage billing to invoice successfully', async () => {
      // Arrange
      const usageBillingId = 'usage_billing_123';
      const invoiceId = 'invoice_123';
      const updatedUsageBilling = {
        ...mockUsageBilling,
        invoiceId,
        status: BillingStatus.PENDING,
      };

      jest
        .spyOn(service, 'getUsageBillingById')
        .mockResolvedValue(mockUsageBilling as UsageBilling);
      jest
        .spyOn(usageBillingRepository, 'save')
        .mockResolvedValue(updatedUsageBilling as UsageBilling);

      // Act
      const result = await service.linkToInvoice(usageBillingId, invoiceId);

      // Assert
      expect(result.invoiceId).toBe(invoiceId);
      expect(result.status).toBe(BillingStatus.PENDING);
      expect(usageBillingRepository.save).toHaveBeenCalledWith({
        ...mockUsageBilling,
        invoiceId,
        status: BillingStatus.PENDING,
      });
    });
  });

  describe('getUsageBillingAnalytics', () => {
    it('should return usage billing analytics', async () => {
      // Arrange
      const tenantId = 'tenant_123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '1000' }),
        getRawMany: jest.fn().mockResolvedValue([
          {
            metricType: UsageMetricType.API_CALLS,
            metricName: 'API Calls',
            totalQuantity: '10000',
            totalRevenue: '1000',
          },
        ]),
      };

      jest
        .spyOn(usageBillingRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(usageBillingRecordRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(usageBillingRepository, 'count').mockResolvedValue(10);

      // Act
      const result = await service.getUsageBillingAnalytics(
        tenantId,
        startDate,
        endDate
      );

      // Assert
      expect(result).toEqual({
        totalUsageRevenue: 1000,
        totalUsageRecords: 10,
        averageUsageAmount: 100,
        topUsageMetrics: [
          {
            metricType: UsageMetricType.API_CALLS,
            metricName: 'API Calls',
            totalQuantity: 10000,
            totalRevenue: 1000,
          },
        ],
      });
    });
  });

  describe('deleteUsageBilling', () => {
    it('should delete usage billing successfully', async () => {
      // Arrange
      const id = 'usage_billing_123';
      const usageBillingToDelete = {
        ...mockUsageBilling,
        status: BillingStatus.PENDING,
        invoiceId: undefined,
      };

      jest
        .spyOn(service, 'getUsageBillingById')
        .mockResolvedValue(usageBillingToDelete as any);
      jest
        .spyOn(usageBillingRepository, 'remove')
        .mockResolvedValue(usageBillingToDelete as any);

      // Act
      await service.deleteUsageBilling(id);

      // Assert
      expect(usageBillingRepository.remove).toHaveBeenCalledWith(
        usageBillingToDelete
      );
    });

    it('should throw error when trying to delete linked usage billing', async () => {
      // Arrange
      const id = 'usage_billing_123';
      const linkedUsageBilling = {
        ...mockUsageBilling,
        status: BillingStatus.PENDING,
        invoiceId: 'invoice_123',
      };

      jest
        .spyOn(service, 'getUsageBillingById')
        .mockResolvedValue(linkedUsageBilling as UsageBilling);

      // Act & Assert
      await expect(service.deleteUsageBilling(id)).rejects.toThrow(
        'Cannot delete usage billing that is linked to an invoice'
      );
    });
  });
});
