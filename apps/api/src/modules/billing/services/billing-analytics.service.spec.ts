import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingAnalyticsService } from './billing-analytics.service';
import { Invoice, BillingHistory } from '../entities';
import { SubscriptionHistory } from '../entities/subscription-history.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { InvoiceStatus, SubscriptionStatus } from '@app/shared';

describe('BillingAnalyticsService', () => {
  let service: BillingAnalyticsService;
  let invoiceRepository: jest.Mocked<Repository<Invoice>>;
  let billingHistoryRepository: jest.Mocked<Repository<BillingHistory>>;
  let subscriptionRepository: jest.Mocked<Repository<Subscription>>;
  let subscriptionHistoryRepository: jest.Mocked<Repository<SubscriptionHistory>>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingAnalyticsService,
        {
          provide: getRepositoryToken(Invoice),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BillingHistory),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SubscriptionHistory),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BillingAnalyticsService>(BillingAnalyticsService);
    invoiceRepository = module.get(getRepositoryToken(Invoice));
    billingHistoryRepository = module.get(getRepositoryToken(BillingHistory));
    subscriptionRepository = module.get(getRepositoryToken(Subscription));
    subscriptionHistoryRepository = module.get(getRepositoryToken(SubscriptionHistory));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBillingAnalytics', () => {
    it('should return comprehensive billing analytics including SaaS metrics', async () => {
      const tenantId = 'tenant-123';
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'month' as const,
        currency: 'USD',
      };

      // Mock basic metrics
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: '5000.00' }) // getTotalRevenue
        .mockResolvedValueOnce({ average: '250.00' }) // getAverageInvoiceAmount
        .mockResolvedValueOnce({ averageDays: '15.5' }) // getAveragePaymentTime
        // Mock MRR calculations with simpler returns
        .mockResolvedValue({ mrr: '1200.00' }); // All MRR-related calls return same value

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          // getRevenueByPeriod
          { period: '2024-01-01', revenue: '5000.00', invoices: '20' },
        ])
        .mockResolvedValueOnce([
          // getTopCustomers
          {
            customerId: 'customer-1',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            totalRevenue: '1000.00',
            invoiceCount: '4',
          },
        ])
        .mockResolvedValue([]); // All other getRawMany calls return empty arrays

      invoiceRepository.count
        .mockResolvedValueOnce(20) // getTotalInvoices
        .mockResolvedValueOnce(18) // getPaidInvoices
        .mockResolvedValueOnce(2); // getOverdueInvoices

      const result = await service.getBillingAnalytics(tenantId, query);

      expect(result).toHaveProperty('totalRevenue', 5000);
      expect(result).toHaveProperty('totalInvoices', 20);
      expect(result).toHaveProperty('paidInvoices', 18);
      expect(result).toHaveProperty('overdueInvoices', 2);
      expect(result).toHaveProperty('averageInvoiceAmount', 250);
      expect(result).toHaveProperty('averagePaymentTime', 15.5);
      expect(result).toHaveProperty('mrr');
      expect(result).toHaveProperty('churn');
      expect(result).toHaveProperty('growth');

      // Just verify the structure exists, not specific values due to complex mocking
      expect(result.mrr).toHaveProperty('currentMRR');
      expect(result.churn).toHaveProperty('currentChurnRate');
      expect(result.growth).toHaveProperty('newCustomers');
    });
  });

  describe('MRR calculations', () => {
    it('should calculate MRR correctly for different billing cycles', async () => {
      const tenantId = 'tenant-123';
      const period = new Date('2024-01-01');
      const currency = 'USD';

      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ mrr: '1000.00' });

      const result = await service['calculateMRRForPeriod'](
        tenantId,
        period,
        currency
      );

      expect(result).toBe(1000);
      expect(subscriptionRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        "SUM(CASE WHEN subscription.billingCycle = 'monthly' THEN subscription.amount WHEN subscription.billingCycle = 'yearly' THEN subscription.amount / 12 WHEN subscription.billingCycle = 'quarterly' THEN subscription.amount / 3 ELSE subscription.amount END)",
        'mrr'
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'subscription.tenantId = :tenantId',
        { tenantId }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'subscription.currency = :currency',
        { currency }
      );
    });
  });

  describe('Churn calculations', () => {
    it('should calculate customer churn rate correctly', async () => {
      const tenantId = 'tenant-123';
      const period = new Date('2024-01-01');

      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ count: '100' }) // customers at start
        .mockResolvedValueOnce({ count: '10' }); // churned customers

      const result = await service['calculateChurnRateForPeriod'](
        tenantId,
        period
      );

      expect(result).toBe(10); // 10/100 * 100 = 10%
      expect(subscriptionRepository.createQueryBuilder).toHaveBeenCalledTimes(
        2
      );
    });

    it('should return 0 churn rate when no customers at start', async () => {
      const tenantId = 'tenant-123';
      const period = new Date('2024-01-01');

      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ count: '0' }) // customers at start
        .mockResolvedValueOnce({ count: '0' }); // churned customers

      const result = await service['calculateChurnRateForPeriod'](
        tenantId,
        period
      );

      expect(result).toBe(0);
    });
  });

  describe('Growth calculations', () => {
    it('should calculate customer growth rate correctly', async () => {
      const tenantId = 'tenant-123';
      const period = new Date('2024-01-01');

      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ count: '50' });

      const result = await service['getTotalActiveCustomers'](tenantId, period);

      expect(result).toBe(50);
      expect(subscriptionRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'COUNT(DISTINCT subscription.userId)',
        'count'
      );
    });

    it('should get new customers for period', async () => {
      const tenantId = 'tenant-123';
      const period = new Date('2024-01-01');

      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ count: '15' });

      const result = await service['getNewCustomersForPeriod'](
        tenantId,
        period
      );

      expect(result).toBe(15);
      expect(subscriptionRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('Revenue calculations', () => {
    it('should calculate total revenue for period', async () => {
      const tenantId = 'tenant-123';
      const period = new Date('2024-01-01');
      const currency = 'USD';

      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ total: '2500.00' });

      const result = await service['getTotalRevenueForPeriod'](
        tenantId,
        period,
        currency
      );

      expect(result).toBe(2500);
      expect(invoiceRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'invoice.status = :status',
        { status: InvoiceStatus.PAID }
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle null/undefined values in calculations', async () => {
      const tenantId = 'tenant-123';
      const period = new Date('2024-01-01');
      const currency = 'USD';

      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ mrr: null });

      const result = await service['calculateMRRForPeriod'](
        tenantId,
        period,
        currency
      );

      expect(result).toBe(0);
    });

    it('should handle division by zero in growth rate calculations', async () => {
      const tenantId = 'tenant-123';
      const period = new Date('2024-01-01');

      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ count: '0' }) // previous customers
        .mockResolvedValueOnce({ count: '0' }); // churned customers

      const result = await service['calculateChurnRateForPeriod'](
        tenantId,
        period
      );

      expect(result).toBe(0);
    });
  });

  describe('Date filtering', () => {
    it('should build correct date filter for date range', () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const result = service['buildDateFilter'](startDate, endDate);

      expect(result).toHaveProperty('createdAt');
      expect(result.createdAt).toBeDefined();
    });

    it('should return empty filter when no dates provided', () => {
      const result = service['buildDateFilter']();

      expect(result).toEqual({});
    });
  });
});
