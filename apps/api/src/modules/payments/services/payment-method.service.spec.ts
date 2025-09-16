import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentMethodService } from './payment-method.service';
import { StripeService } from './stripe.service';
import {
  PaymentMethod,
  PaymentMethodType,
  PaymentMethodStatus,
} from '../entities/payment-method.entity';

describe('PaymentMethodService', () => {
  let service: PaymentMethodService;
  let mockPaymentMethodRepository: jest.Mocked<Repository<PaymentMethod>>;
  let mockStripeService: jest.Mocked<StripeService>;

  const mockPaymentMethod: PaymentMethod = {
    id: 'pm-123',
    tenantId: 'tenant-123',
    userId: 'user-123',
    type: PaymentMethodType.CARD,
    status: PaymentMethodStatus.ACTIVE,
    stripePaymentMethodId: 'pm_test123',
    stripeCustomerId: 'cus_test123',
    isDefault: false,
    cardBrand: 'visa',
    cardLast4: '4242',
    cardExpMonth: '12',
    cardExpYear: '2025',
    billingDetails: {
      name: 'Test User',
      email: 'test@example.com',
    },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    isExpired: false,
    isActive: true,
    displayName: 'Visa •••• 4242',
    maskedNumber: '•••• •••• •••• 4242',
  } as PaymentMethod;

  const mockStripePaymentMethod: Stripe.PaymentMethod = {
    id: 'pm_test123',
    object: 'payment_method',
    type: 'card',
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025,
    },
    billing_details: {
      name: 'Test User',
      email: 'test@example.com',
    },
    customer: 'cus_test123',
    created: 1234567890,
    livemode: false,
    metadata: {},
  } as Stripe.PaymentMethod;

  beforeEach(async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodService,
        {
          provide: getRepositoryToken(PaymentMethod),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            remove: jest.fn(),
          },
        },
        {
          provide: StripeService,
          useValue: {
            getPaymentMethod: jest.fn(),
            updatePaymentMethod: jest.fn(),
            detachPaymentMethod: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentMethodService>(PaymentMethodService);
    mockPaymentMethodRepository = module.get(getRepositoryToken(PaymentMethod));
    mockStripeService = module.get(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentMethod', () => {
    it('should create a payment method successfully', async () => {
      const createPaymentMethodDto = {
        tenantId: 'tenant-123',
        userId: 'user-123',
        type: PaymentMethodType.CARD,
        stripePaymentMethodId: 'pm_test123',
        stripeCustomerId: 'cus_test123',
        isDefault: false,
      };

      mockStripeService.getPaymentMethod.mockResolvedValue(
        mockStripePaymentMethod
      );
      mockPaymentMethodRepository.create.mockReturnValue(mockPaymentMethod);
      mockPaymentMethodRepository.save.mockResolvedValue(mockPaymentMethod);

      const result = await service.createPaymentMethod(createPaymentMethodDto);

      expect(mockStripeService.getPaymentMethod).toHaveBeenCalledWith(
        'pm_test123'
      );
      expect(mockPaymentMethodRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockPaymentMethod);
    });

    it('should handle setting default payment method', async () => {
      const createPaymentMethodDto = {
        tenantId: 'tenant-123',
        userId: 'user-123',
        type: PaymentMethodType.CARD,
        stripePaymentMethodId: 'pm_test123',
        stripeCustomerId: 'cus_test123',
        isDefault: true,
      };

      const defaultPaymentMethod = {
        ...mockPaymentMethod,
        isDefault: true,
      } as PaymentMethod;

      mockStripeService.getPaymentMethod.mockResolvedValue(
        mockStripePaymentMethod
      );
      mockPaymentMethodRepository.create.mockReturnValue(defaultPaymentMethod);
      mockPaymentMethodRepository.save.mockResolvedValue(defaultPaymentMethod);

      const result = await service.createPaymentMethod(createPaymentMethodDto);

      expect(mockPaymentMethodRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual(defaultPaymentMethod);
    });
  });

  describe('updatePaymentMethod', () => {
    it('should update a payment method successfully', async () => {
      const updatePaymentMethodDto = {
        isDefault: true,
        billingDetails: {
          name: 'Updated User',
          email: 'updated@example.com',
        },
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };

      mockPaymentMethodRepository.findOne.mockResolvedValue(mockPaymentMethod);
      mockPaymentMethodRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any
      );
      mockPaymentMethodRepository.save.mockResolvedValue(mockPaymentMethod);

      const result = await service.updatePaymentMethod(
        'pm-123',
        updatePaymentMethodDto
      );

      expect(mockPaymentMethodRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockPaymentMethod);
    });

    it('should handle payment method not found', async () => {
      const updatePaymentMethodDto = {
        isDefault: true,
      };

      mockPaymentMethodRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePaymentMethod('pm-123', updatePaymentMethodDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePaymentMethod', () => {
    it('should delete a payment method successfully', async () => {
      mockPaymentMethodRepository.findOne.mockResolvedValue(mockPaymentMethod);
      mockStripeService.detachPaymentMethod.mockResolvedValue(
        mockStripePaymentMethod
      );
      mockPaymentMethodRepository.remove.mockResolvedValue(mockPaymentMethod);

      await service.deletePaymentMethod('pm-123');

      expect(mockStripeService.detachPaymentMethod).toHaveBeenCalledWith(
        'pm_test123'
      );
      expect(mockPaymentMethodRepository.remove).toHaveBeenCalledWith(
        mockPaymentMethod
      );
    });

    it('should handle payment method not found', async () => {
      mockPaymentMethodRepository.findOne.mockResolvedValue(null);

      await expect(service.deletePaymentMethod('pm-123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getPaymentMethod', () => {
    it('should return payment method by ID', async () => {
      mockPaymentMethodRepository.findOne.mockResolvedValue(mockPaymentMethod);

      const result = await service.getPaymentMethod('pm-123');

      expect(mockPaymentMethodRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'pm-123' },
      });
      expect(result).toEqual(mockPaymentMethod);
    });

    it('should throw NotFoundException for non-existent payment method', async () => {
      mockPaymentMethodRepository.findOne.mockResolvedValue(null);

      await expect(service.getPaymentMethod('pm-123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('listPaymentMethods', () => {
    it('should return paginated payment methods', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([mockPaymentMethod]),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPaymentMethod], 1]),
      };

      mockPaymentMethodRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any
      );

      const result = await service.listPaymentMethods({
        tenantId: 'tenant-123',
        userId: 'user-123',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({
        paymentMethods: [mockPaymentMethod],
        total: 1,
      });
    });

    it('should apply type filter', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([mockPaymentMethod]),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPaymentMethod], 1]),
      };

      mockPaymentMethodRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any
      );

      await service.listPaymentMethods({
        tenantId: 'tenant-123',
        userId: 'user-123',
        type: PaymentMethodType.CARD,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'paymentMethod.type = :type',
        {
          type: PaymentMethodType.CARD,
        }
      );
    });

    it('should apply status filter', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([mockPaymentMethod]),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPaymentMethod], 1]),
      };

      mockPaymentMethodRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any
      );

      await service.listPaymentMethods({
        tenantId: 'tenant-123',
        userId: 'user-123',
        status: PaymentMethodStatus.ACTIVE,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'paymentMethod.status = :status',
        {
          status: PaymentMethodStatus.ACTIVE,
        }
      );
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set payment method as default successfully', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };

      mockPaymentMethodRepository.findOne.mockResolvedValue(mockPaymentMethod);
      mockPaymentMethodRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any
      );
      mockPaymentMethodRepository.save.mockResolvedValue(mockPaymentMethod);

      const result = await service.setDefaultPaymentMethod('pm-123');

      expect(mockQueryBuilder.execute).toHaveBeenCalled();
      expect(mockPaymentMethodRepository.save).toHaveBeenCalledWith({
        ...mockPaymentMethod,
        isDefault: true,
      });
      expect(result).toEqual(mockPaymentMethod);
    });

    it('should handle payment method not found', async () => {
      mockPaymentMethodRepository.findOne.mockResolvedValue(null);

      await expect(service.setDefaultPaymentMethod('pm-123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getDefaultPaymentMethod', () => {
    it('should return default payment method', async () => {
      const defaultPaymentMethod = {
        ...mockPaymentMethod,
        isDefault: true,
      } as PaymentMethod;
      mockPaymentMethodRepository.findOne.mockResolvedValue(
        defaultPaymentMethod
      );

      const result = await service.getDefaultPaymentMethod(
        'tenant-123',
        'user-123'
      );

      expect(mockPaymentMethodRepository.findOne).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          userId: 'user-123',
          isDefault: true,
          status: PaymentMethodStatus.ACTIVE,
        },
      });
      expect(result).toEqual(defaultPaymentMethod);
    });

    it('should return null when no default payment method exists', async () => {
      mockPaymentMethodRepository.findOne.mockResolvedValue(null);

      const result = await service.getDefaultPaymentMethod(
        'tenant-123',
        'user-123'
      );

      expect(result).toBeNull();
    });
  });

  describe('updatePaymentMethodFromStripe', () => {
    it('should update payment method from Stripe webhook', async () => {
      mockPaymentMethodRepository.findOne.mockResolvedValue(mockPaymentMethod);
      mockPaymentMethodRepository.save.mockResolvedValue(mockPaymentMethod);

      await service.updatePaymentMethodFromStripe(mockStripePaymentMethod);

      expect(mockPaymentMethodRepository.save).toHaveBeenCalled();
    });

    it('should handle payment method not found', async () => {
      mockPaymentMethodRepository.findOne.mockResolvedValue(null);

      await service.updatePaymentMethodFromStripe(mockStripePaymentMethod);

      expect(mockPaymentMethodRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('validatePaymentMethod', () => {
    it('should return true for valid active payment method', async () => {
      mockPaymentMethodRepository.findOne.mockResolvedValue(mockPaymentMethod);
      mockStripeService.getPaymentMethod.mockResolvedValue(
        mockStripePaymentMethod
      );

      const result = await service.validatePaymentMethod('pm-123');

      expect(result).toBe(true);
    });

    it('should return false for inactive payment method', async () => {
      const inactivePaymentMethod = {
        ...mockPaymentMethod,
        isActive: false,
      } as PaymentMethod;
      mockPaymentMethodRepository.findOne.mockResolvedValue(
        inactivePaymentMethod
      );

      const result = await service.validatePaymentMethod('pm-123');

      expect(result).toBe(false);
    });

    it('should handle payment method not found', async () => {
      mockPaymentMethodRepository.findOne.mockResolvedValue(null);

      const result = await service.validatePaymentMethod('pm-123');

      expect(result).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should unset other default payment methods', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };

      mockPaymentMethodRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any
      );

      await (service as any).unsetOtherDefaults('tenant-123', 'user-123');

      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });

    it('should extract payment method details from Stripe', () => {
      const result = (service as any).extractPaymentMethodDetails(
        mockStripePaymentMethod
      );

      expect(result).toEqual({
        cardBrand: 'visa',
        cardLast4: '4242',
        cardExpMonth: '12',
        cardExpYear: '2025',
        billingDetails: {
          name: 'Test User',
          email: 'test@example.com',
        },
      });
    });

    it('should handle payment method without card details', () => {
      const paymentMethodWithoutCard = {
        ...mockStripePaymentMethod,
        card: null,
      };
      const result = (service as any).extractPaymentMethodDetails(
        paymentMethodWithoutCard
      );

      expect(result.cardBrand).toBeUndefined();
      expect(result.cardLast4).toBeUndefined();
    });
  });
});
