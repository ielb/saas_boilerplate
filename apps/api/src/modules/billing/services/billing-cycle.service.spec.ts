import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingCycleService } from './billing-cycle.service';
import { BillingCycleEntity, Invoice } from '../entities';
import { InvoiceService } from './invoice.service';
import { BillingStatus, BillingCycle } from '@app/shared';

describe('BillingCycleService', () => {
  let service: BillingCycleService;
  let billingCycleRepository: Repository<BillingCycleEntity>;
  let invoiceRepository: Repository<Invoice>;
  let invoiceService: InvoiceService;

  const mockBillingCycle: Partial<BillingCycleEntity> = {
    id: 'cycle_123',
    tenantId: 'tenant_123',
    subscriptionId: 'subscription_123',
    cycleType: BillingCycle.MONTHLY,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    billingDate: new Date('2024-02-01'),
    totalAmount: 100,
    currency: 'USD',
    status: BillingStatus.PENDING,
    metadata: {
      isRecurring: true,
      scheduledAt: new Date('2024-01-01'),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvoice: Partial<Invoice> = {
    id: 'invoice_123',
    invoiceNumber: 'INV-2024-01-0001',
    totalAmount: 100,
    currency: 'USD',
    status: 'pending' as any,
    tenantId: 'tenant_123',
    customerId: 'customer_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingCycleService,
        {
          provide: getRepositoryToken(BillingCycleEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: InvoiceService,
          useValue: {
            createInvoice: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BillingCycleService>(BillingCycleService);
    billingCycleRepository = module.get<Repository<BillingCycleEntity>>(
      getRepositoryToken(BillingCycleEntity)
    );
    invoiceRepository = module.get<Repository<Invoice>>(
      getRepositoryToken(Invoice)
    );
    invoiceService = module.get<InvoiceService>(InvoiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBillingCycle', () => {
    it('should create billing cycle successfully', async () => {
      // Arrange
      const tenantId = 'tenant_123';
      const data = {
        subscriptionId: 'subscription_123',
        cycleType: BillingCycle.MONTHLY,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        billingDate: new Date('2024-02-01'),
        metadata: { isRecurring: true },
      };

      const createdCycle = { ...mockBillingCycle, ...data };
      jest
        .spyOn(billingCycleRepository, 'create')
        .mockReturnValue(createdCycle as BillingCycleEntity);
      jest
        .spyOn(billingCycleRepository, 'save')
        .mockResolvedValue(createdCycle as BillingCycleEntity);

      // Act
      const result = await service.createBillingCycle(tenantId, data);

      // Assert
      expect(result).toEqual(createdCycle);
      expect(billingCycleRepository.create).toHaveBeenCalledWith({
        ...data,
        tenantId,
        status: BillingStatus.PENDING,
        totalAmount: 0,
        currency: 'USD',
      });
    });
  });

  describe('processBillingCycle', () => {
    it('should process billing cycle successfully', async () => {
      // Arrange
      const cycleId = 'cycle_123';
      const cycleWithRelations = {
        ...mockBillingCycle,
        subscription: { id: 'subscription_123', userId: 'user_123' },
        tenant: { id: 'tenant_123' },
      };

      jest
        .spyOn(billingCycleRepository, 'findOne')
        .mockResolvedValue(cycleWithRelations as any);
      jest
        .spyOn(invoiceService, 'createInvoice')
        .mockResolvedValue(mockInvoice as Invoice);
      jest.spyOn(billingCycleRepository, 'save').mockResolvedValue({
        ...cycleWithRelations,
        invoiceId: 'invoice_123',
        totalAmount: 100,
        status: BillingStatus.PAID,
      } as any);

      // Act
      const result = await service.processBillingCycle(cycleId);

      // Assert
      expect(result.invoiceId).toBe('invoice_123');
      expect(result.status).toBe(BillingStatus.PAID);
      expect(invoiceService.createInvoice).toHaveBeenCalled();
    });

    it('should throw error when cycle not found', async () => {
      // Arrange
      const cycleId = 'nonexistent';
      jest.spyOn(billingCycleRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.processBillingCycle(cycleId)).rejects.toThrow(
        'Billing cycle with ID nonexistent not found'
      );
    });

    it('should throw error when cycle is not pending', async () => {
      // Arrange
      const cycleId = 'cycle_123';
      const nonPendingCycle = {
        ...mockBillingCycle,
        status: BillingStatus.PAID,
      };
      jest
        .spyOn(billingCycleRepository, 'findOne')
        .mockResolvedValue(nonPendingCycle as any);

      // Act & Assert
      await expect(service.processBillingCycle(cycleId)).rejects.toThrow(
        'Billing cycle cycle_123 is not in pending status'
      );
    });
  });

  describe('getUpcomingBillingCycles', () => {
    it('should return upcoming billing cycles', async () => {
      // Arrange
      const tenantId = 'tenant_123';
      const days = 7;
      const upcomingCycles = [mockBillingCycle as BillingCycleEntity];

      jest
        .spyOn(billingCycleRepository, 'find')
        .mockResolvedValue(upcomingCycles);

      // Act
      const result = await service.getUpcomingBillingCycles(tenantId, days);

      // Assert
      expect(result).toEqual(upcomingCycles);
      expect(billingCycleRepository.find).toHaveBeenCalledWith({
        where: {
          tenantId,
          billingDate: expect.any(Object),
          status: BillingStatus.PENDING,
        },
        relations: ['subscription', 'tenant'],
        order: { billingDate: 'ASC' },
      });
    });
  });

  describe('getBillingCyclesBySubscription', () => {
    it('should return billing cycles for subscription', async () => {
      // Arrange
      const subscriptionId = 'subscription_123';
      const cycles = [mockBillingCycle as BillingCycleEntity];

      jest.spyOn(billingCycleRepository, 'find').mockResolvedValue(cycles);

      // Act
      const result =
        await service.getBillingCyclesBySubscription(subscriptionId);

      // Assert
      expect(result).toEqual(cycles);
      expect(billingCycleRepository.find).toHaveBeenCalledWith({
        where: { subscriptionId },
        relations: ['invoice', 'tenant'],
        order: { billingDate: 'DESC' },
      });
    });
  });

  describe('updateBillingCycleStatus', () => {
    it('should update billing cycle status successfully', async () => {
      // Arrange
      const cycleId = 'cycle_123';
      const newStatus = BillingStatus.PAID;
      const updatedCycle = { ...mockBillingCycle, status: newStatus };

      jest
        .spyOn(billingCycleRepository, 'findOne')
        .mockResolvedValue(mockBillingCycle as BillingCycleEntity);
      jest
        .spyOn(billingCycleRepository, 'save')
        .mockResolvedValue(updatedCycle as BillingCycleEntity);

      // Act
      const result = await service.updateBillingCycleStatus(cycleId, newStatus);

      // Assert
      expect(result.status).toBe(newStatus);
      expect(billingCycleRepository.save).toHaveBeenCalledWith({
        ...mockBillingCycle,
        status: newStatus,
      });
    });

    it('should throw error when cycle not found', async () => {
      // Arrange
      const cycleId = 'nonexistent';
      jest.spyOn(billingCycleRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateBillingCycleStatus(cycleId, BillingStatus.PAID)
      ).rejects.toThrow('Billing cycle with ID nonexistent not found');
    });
  });

  describe('scheduleRecurringBilling', () => {
    it('should schedule recurring billing successfully', async () => {
      // Arrange
      const tenantId = 'tenant_123';
      const subscriptionId = 'subscription_123';
      const cycleType = BillingCycle.MONTHLY;

      jest
        .spyOn(service, 'createBillingCycle')
        .mockResolvedValue(mockBillingCycle as BillingCycleEntity);

      // Act
      await service.scheduleRecurringBilling(
        tenantId,
        subscriptionId,
        cycleType
      );

      // Assert
      expect(service.createBillingCycle).toHaveBeenCalledWith(tenantId, {
        subscriptionId,
        cycleType,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        billingDate: expect.any(Date),
        metadata: {
          isRecurring: true,
          scheduledAt: expect.any(Date),
        },
      });
    });
  });

  describe('cancelBillingCycle', () => {
    it('should cancel billing cycle successfully', async () => {
      // Arrange
      const cycleId = 'cycle_123';
      const pendingCycle = {
        ...mockBillingCycle,
        status: BillingStatus.PENDING,
      };
      const cancelledCycle = {
        ...pendingCycle,
        status: BillingStatus.CANCELLED,
      };

      jest
        .spyOn(billingCycleRepository, 'findOne')
        .mockResolvedValue(pendingCycle as BillingCycleEntity);
      jest
        .spyOn(billingCycleRepository, 'save')
        .mockResolvedValue(cancelledCycle as BillingCycleEntity);

      // Act
      const result = await service.cancelBillingCycle(cycleId);

      // Assert
      expect(result.status).toBe(BillingStatus.CANCELLED);
      expect(billingCycleRepository.save).toHaveBeenCalledWith({
        ...pendingCycle,
        status: BillingStatus.CANCELLED,
      });
    });

    it('should throw error when trying to cancel paid cycle', async () => {
      // Arrange
      const cycleId = 'cycle_123';
      const paidCycle = { ...mockBillingCycle, status: BillingStatus.PAID };
      jest
        .spyOn(billingCycleRepository, 'findOne')
        .mockResolvedValue(paidCycle as BillingCycleEntity);

      // Act & Assert
      await expect(service.cancelBillingCycle(cycleId)).rejects.toThrow(
        'Cannot cancel a paid billing cycle'
      );
    });
  });
});
