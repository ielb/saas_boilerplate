import { BillingAnalyticsController } from './billing-analytics.controller';
import { BillingAnalyticsService } from '../services/billing-analytics.service';
import { BillingAnalyticsQueryDto } from '../dto';

describe('BillingAnalyticsController', () => {
  let controller: BillingAnalyticsController;
  let service: jest.Mocked<BillingAnalyticsService>;

  const mockAnalyticsData = {
    totalRevenue: 10000,
    totalInvoices: 50,
    paidInvoices: 45,
    overdueInvoices: 5,
    averageInvoiceAmount: 200,
    averagePaymentTime: 15,
    revenueByPeriod: [
      { period: '2024-01-01', revenue: 5000, invoices: 25 },
      { period: '2024-02-01', revenue: 5000, invoices: 25 },
    ],
    topCustomers: [
      {
        customerId: 'customer-1',
        email: 'test@example.com',
        name: 'John Doe',
        totalRevenue: 2000,
        invoiceCount: 10,
      },
    ],
    paymentMethods: [
      { method: 'Credit Card', count: 40, percentage: 80 },
      { method: 'Bank Transfer', count: 10, percentage: 20 },
    ],
    mrr: {
      currentMRR: 1500,
      previousMRR: 1400,
      mrrGrowthRate: 7.14,
      newMRR: 300,
      churnedMRR: 200,
      expansionMRR: 0,
      contractionMRR: 0,
      netMRRMovement: 100,
      mrrByPeriod: [
        { period: new Date('2024-01-01'), mrr: 1400 },
        { period: new Date('2024-02-01'), mrr: 1500 },
      ],
    },
    churn: {
      currentChurnRate: 5,
      previousChurnRate: 4,
      revenueChurnRate: 3,
      churnReasons: [
        { reason: 'Price too high', count: 3 },
        { reason: 'Found alternative', count: 2 },
      ],
      churnByPeriod: [
        { period: new Date('2024-01-01'), churnRate: 4 },
        { period: new Date('2024-02-01'), churnRate: 5 },
      ],
      averageCustomerLifetimeValue: 2000,
    },
    growth: {
      newCustomers: 15,
      totalActiveCustomers: 200,
      customerGrowthRate: 8.1,
      currentRevenue: 5000,
      revenueGrowthRate: 12.5,
      arpu: 25,
      growthByPeriod: [
        {
          period: new Date('2024-01-01'),
          customers: 185,
          revenue: 4500,
          customerGrowthRate: 5.4,
          revenueGrowthRate: 8.2,
        },
        {
          period: new Date('2024-02-01'),
          customers: 200,
          revenue: 5000,
          customerGrowthRate: 8.1,
          revenueGrowthRate: 11.1,
        },
      ],
    },
  };

  const mockRequest = {
    user: { tenantId: 'tenant-123' },
  };

  beforeEach(async () => {
    service = {
      getBillingAnalytics: jest.fn(),
    } as any;

    controller = new BillingAnalyticsController(service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBillingAnalytics', () => {
    it('should return comprehensive billing analytics', async () => {
      const query: BillingAnalyticsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'month',
        currency: 'USD',
      };

      service.getBillingAnalytics.mockResolvedValue(mockAnalyticsData);

      const result = await controller.getBillingAnalytics(mockRequest, query);

      expect(service.getBillingAnalytics).toHaveBeenCalledWith(
        'tenant-123',
        query
      );
      expect(result).toEqual({
        success: true,
        data: mockAnalyticsData,
      });
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should return revenue-specific analytics', async () => {
      const query: BillingAnalyticsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'month',
        currency: 'USD',
      };

      service.getBillingAnalytics.mockResolvedValue(mockAnalyticsData);

      const result = await controller.getRevenueAnalytics(mockRequest, query);

      expect(service.getBillingAnalytics).toHaveBeenCalledWith(
        'tenant-123',
        query
      );
      expect(result).toEqual({
        success: true,
        data: {
          totalRevenue: mockAnalyticsData.totalRevenue,
          revenueByPeriod: mockAnalyticsData.revenueByPeriod,
          averageInvoiceAmount: mockAnalyticsData.averageInvoiceAmount,
        },
      });
    });
  });

  describe('getInvoiceAnalytics', () => {
    it('should return invoice-specific analytics', async () => {
      const query: BillingAnalyticsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'month',
        currency: 'USD',
      };

      service.getBillingAnalytics.mockResolvedValue(mockAnalyticsData);

      const result = await controller.getInvoiceAnalytics(mockRequest, query);

      expect(service.getBillingAnalytics).toHaveBeenCalledWith(
        'tenant-123',
        query
      );
      expect(result).toEqual({
        success: true,
        data: {
          totalInvoices: mockAnalyticsData.totalInvoices,
          paidInvoices: mockAnalyticsData.paidInvoices,
          overdueInvoices: mockAnalyticsData.overdueInvoices,
          averagePaymentTime: mockAnalyticsData.averagePaymentTime,
        },
      });
    });
  });

  describe('getCustomerAnalytics', () => {
    it('should return customer-specific analytics', async () => {
      const query: BillingAnalyticsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'month',
        currency: 'USD',
      };

      service.getBillingAnalytics.mockResolvedValue(mockAnalyticsData);

      const result = await controller.getCustomerAnalytics(mockRequest, query);

      expect(service.getBillingAnalytics).toHaveBeenCalledWith(
        'tenant-123',
        query
      );
      expect(result).toEqual({
        success: true,
        data: {
          topCustomers: mockAnalyticsData.topCustomers,
        },
      });
    });
  });

  describe('getPaymentMethodAnalytics', () => {
    it('should return payment method analytics', async () => {
      const query: BillingAnalyticsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'month',
        currency: 'USD',
      };

      service.getBillingAnalytics.mockResolvedValue(mockAnalyticsData);

      const result = await controller.getPaymentMethodAnalytics(
        mockRequest,
        query
      );

      expect(service.getBillingAnalytics).toHaveBeenCalledWith(
        'tenant-123',
        query
      );
      expect(result).toEqual({
        success: true,
        data: {
          paymentMethods: mockAnalyticsData.paymentMethods,
        },
      });
    });
  });

  describe('getMRRAnalytics', () => {
    it('should return MRR analytics', async () => {
      const query: BillingAnalyticsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'month',
        currency: 'USD',
      };

      service.getBillingAnalytics.mockResolvedValue(mockAnalyticsData);

      const result = await controller.getMRRAnalytics(mockRequest, query);

      expect(service.getBillingAnalytics).toHaveBeenCalledWith(
        'tenant-123',
        query
      );
      expect(result).toEqual({
        success: true,
        data: {
          mrr: mockAnalyticsData.mrr,
        },
      });
    });
  });

  describe('getChurnAnalytics', () => {
    it('should return churn analytics', async () => {
      const query: BillingAnalyticsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'month',
        currency: 'USD',
      };

      service.getBillingAnalytics.mockResolvedValue(mockAnalyticsData);

      const result = await controller.getChurnAnalytics(mockRequest, query);

      expect(service.getBillingAnalytics).toHaveBeenCalledWith(
        'tenant-123',
        query
      );
      expect(result).toEqual({
        success: true,
        data: {
          churn: mockAnalyticsData.churn,
        },
      });
    });
  });

  describe('getGrowthAnalytics', () => {
    it('should return growth analytics', async () => {
      const query: BillingAnalyticsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'month',
        currency: 'USD',
      };

      service.getBillingAnalytics.mockResolvedValue(mockAnalyticsData);

      const result = await controller.getGrowthAnalytics(mockRequest, query);

      expect(service.getBillingAnalytics).toHaveBeenCalledWith(
        'tenant-123',
        query
      );
      expect(result).toEqual({
        success: true,
        data: {
          growth: mockAnalyticsData.growth,
        },
      });
    });
  });

  describe('getSaaSMetrics', () => {
    it('should return comprehensive SaaS metrics', async () => {
      const query: BillingAnalyticsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'month',
        currency: 'USD',
      };

      service.getBillingAnalytics.mockResolvedValue(mockAnalyticsData);

      const result = await controller.getSaaSMetrics(mockRequest, query);

      expect(service.getBillingAnalytics).toHaveBeenCalledWith(
        'tenant-123',
        query
      );
      expect(result).toEqual({
        success: true,
        data: {
          mrr: mockAnalyticsData.mrr,
          churn: mockAnalyticsData.churn,
          growth: mockAnalyticsData.growth,
        },
      });
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      const query: BillingAnalyticsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'month',
        currency: 'USD',
      };

      const error = new Error('Database connection failed');
      service.getBillingAnalytics.mockRejectedValue(error);

      await expect(
        controller.getBillingAnalytics(mockRequest, query)
      ).rejects.toThrow(error);
      expect(service.getBillingAnalytics).toHaveBeenCalledWith(
        'tenant-123',
        query
      );
    });
  });

  describe('Default query parameters', () => {
    it('should use default values when query parameters are not provided', async () => {
      const query: BillingAnalyticsQueryDto = {};

      service.getBillingAnalytics.mockResolvedValue(mockAnalyticsData);

      await controller.getBillingAnalytics(mockRequest, query);

      expect(service.getBillingAnalytics).toHaveBeenCalledWith(
        'tenant-123',
        query
      );
    });
  });
});
