import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  PaymentMethodService,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from '../services/payment-method.service';
import { PaymentGuard } from '../guards/payment.guard';
import { PaymentInterceptor } from '../interceptors/payment.interceptor';
import { PaymentLoggingInterceptor } from '../interceptors/payment-logging.interceptor';
import {
  PaymentMethod,
  PaymentMethodType,
  PaymentMethodStatus,
} from '../entities/payment-method.entity';
import { User } from '../../users/entities/user.entity';

@ApiTags('Payment Methods')
@Controller('payment-methods')
@UseGuards(PaymentGuard)
@UseInterceptors(PaymentInterceptor, PaymentLoggingInterceptor)
@ApiBearerAuth()
export class PaymentMethodsController {
  constructor(private readonly paymentMethodService: PaymentMethodService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment method' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment method created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment method data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async createPaymentMethod(
    @Body() createPaymentMethodDto: CreatePaymentMethodDto,
    @Request() req: any
  ): Promise<PaymentMethod> {
    const user = req.user as User;
    return this.paymentMethodService.createPaymentMethod({
      ...createPaymentMethodDto,
      tenantId: user.tenantId,
      userId: user.id,
    });
  }

  @Put(':paymentMethodId')
  @ApiOperation({ summary: 'Update a payment method' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid update data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment method not found',
  })
  async updatePaymentMethod(
    @Param('paymentMethodId') paymentMethodId: string,
    @Body() updatePaymentMethodDto: UpdatePaymentMethodDto
  ): Promise<PaymentMethod> {
    return this.paymentMethodService.updatePaymentMethod(
      paymentMethodId,
      updatePaymentMethodDto
    );
  }

  @Delete(':paymentMethodId')
  @ApiOperation({ summary: 'Delete a payment method' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment method not found',
  })
  async deletePaymentMethod(
    @Param('paymentMethodId') paymentMethodId: string
  ): Promise<void> {
    return this.paymentMethodService.deletePaymentMethod(paymentMethodId);
  }

  @Get()
  @ApiOperation({ summary: 'List payment methods' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment methods retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async listPaymentMethods(
    @Request() req: any,
    @Query('type') type?: PaymentMethodType,
    @Query('status') status?: PaymentMethodStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<{ paymentMethods: PaymentMethod[]; total: number }> {
    const user = req.user as User;
    const params: any = {
      tenantId: user.tenantId,
      userId: user.id,
    };
    if (type) params.type = type;
    if (status) params.status = status;
    if (limit) params.limit = Number(limit);
    if (offset) params.offset = Number(offset);

    return this.paymentMethodService.listPaymentMethods(params);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default payment method' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default payment method retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No default payment method found',
  })
  async getDefaultPaymentMethod(
    @Request() req: any
  ): Promise<PaymentMethod | null> {
    const user = req.user as User;
    return this.paymentMethodService.getDefaultPaymentMethod(
      user.tenantId,
      user.id
    );
  }

  @Get(':paymentMethodId')
  @ApiOperation({ summary: 'Get payment method by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment method not found',
  })
  async getPaymentMethod(
    @Param('paymentMethodId') paymentMethodId: string
  ): Promise<PaymentMethod> {
    return this.paymentMethodService.getPaymentMethod(paymentMethodId);
  }

  @Post(':paymentMethodId/set-default')
  @ApiOperation({ summary: 'Set payment method as default' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method set as default successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment method not found',
  })
  async setDefaultPaymentMethod(
    @Param('paymentMethodId') paymentMethodId: string
  ): Promise<PaymentMethod> {
    return this.paymentMethodService.setDefaultPaymentMethod(paymentMethodId);
  }

  @Post(':paymentMethodId/validate')
  @ApiOperation({ summary: 'Validate payment method' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method validation result',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment method not found',
  })
  async validatePaymentMethod(
    @Param('paymentMethodId') paymentMethodId: string
  ): Promise<{ valid: boolean }> {
    const isValid =
      await this.paymentMethodService.validatePaymentMethod(paymentMethodId);
    return { valid: isValid };
  }
}
