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
  PaymentService,
  CreatePaymentDto,
  ConfirmPaymentDto,
  CapturePaymentDto,
  RefundPaymentDto,
} from '../services/payment.service';
import { StripeService } from '../services/stripe.service';
import { PaymentGuard } from '../guards/payment.guard';
import { PaymentInterceptor } from '../interceptors/payment.interceptor';
import { PaymentLoggingInterceptor } from '../interceptors/payment-logging.interceptor';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { PaymentRefund } from '../entities/payment-refund.entity';
import { User } from '../../users/entities/user.entity';
import { Public } from '../../../common/decorators/auth.decorator';

@ApiTags('Payments')
@Controller('payments')
@UseInterceptors(PaymentInterceptor, PaymentLoggingInterceptor)
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly stripeService: StripeService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: any
  ): Promise<Payment> {
    const user = req.user as User;
    return this.paymentService.createPayment({
      ...createPaymentDto,
      tenantId: user.tenantId,
      userId: user.id,
    });
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm a payment intent' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment confirmed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid confirmation data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment intent not found',
  })
  async confirmPayment(
    @Body() confirmPaymentDto: ConfirmPaymentDto
  ): Promise<Payment> {
    return this.paymentService.confirmPayment(confirmPaymentDto);
  }

  @Post('capture')
  @ApiOperation({ summary: 'Capture a payment intent' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment captured successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid capture data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment intent not found',
  })
  async capturePayment(
    @Body() capturePaymentDto: CapturePaymentDto
  ): Promise<Payment> {
    return this.paymentService.capturePayment(capturePaymentDto);
  }

  @Post('cancel/:paymentIntentId')
  @ApiOperation({ summary: 'Cancel a payment intent' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment canceled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment intent not found',
  })
  async cancelPayment(
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: { reason?: string }
  ): Promise<Payment> {
    return this.paymentService.cancelPayment(paymentIntentId, body.reason);
  }

  @Post('refund')
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Refund created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid refund data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async refundPayment(
    @Body() refundPaymentDto: RefundPaymentDto
  ): Promise<PaymentRefund> {
    return this.paymentService.refundPayment(refundPaymentDto);
  }

  @Get()
  @ApiOperation({ summary: 'List payments' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payments retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async listPayments(
    @Request() req: any,
    @Query('status') status?: PaymentStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<{ payments: Payment[]; total: number }> {
    const user = req.user as User;
    return this.paymentService.listPayments({
      tenantId: user.tenantId,
      userId: user.id,
      ...(status && { status }),
      ...(limit && { limit: Number(limit) }),
      ...(offset && { offset: Number(offset) }),
    });
  }

  @Get(':paymentId')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async getPayment(@Param('paymentId') paymentId: string): Promise<Payment> {
    return this.paymentService.getPayment(paymentId);
  }

  @Get('intent/:paymentIntentId')
  @ApiOperation({ summary: 'Get payment intent by Stripe ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment intent retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment intent not found',
  })
  async getPaymentIntent(
    @Param('paymentIntentId') paymentIntentId: string
  ): Promise<any> {
    return this.paymentService.getPaymentIntent(paymentIntentId);
  }

  @Get('stripe/test-connectivity')
  @Public() // No authentication required for connectivity test
  @ApiOperation({ summary: 'Test Stripe API connectivity' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stripe connectivity test successful',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Stripe connectivity test failed',
  })
  async testStripeConnectivity(): Promise<{
    success: boolean;
    message: string;
    account?: any;
    config?: any;
    error?: string;
  }> {
    try {
      // Test basic connectivity by retrieving account information
      const stripe = this.stripeService.getStripeInstance();
      const account = await stripe.accounts.retrieve();

      // Get Stripe configuration
      const config = this.stripeService.getConfig();

      return {
        success: true,
        message: 'Stripe API connectivity test successful',
        account: {
          id: account.id,
          email: account.email,
          country: account.country,
          currency: account.default_currency,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          type: account.type,
        },
        config: {
          apiVersion: config.apiVersion,
          maxNetworkRetries: config.maxNetworkRetries,
          timeout: config.timeout,
          // Don't expose secret keys
          secretKey: config.secretKey
            ? `${config.secretKey.substring(0, 8)}...`
            : 'Not configured',
          publishableKey: config.publishableKey
            ? `${config.publishableKey.substring(0, 8)}...`
            : 'Not configured',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Stripe API connectivity test failed',
        error: error.message,
        config: {
          apiVersion: this.stripeService.getConfig().apiVersion,
          maxNetworkRetries: this.stripeService.getConfig().maxNetworkRetries,
          timeout: this.stripeService.getConfig().timeout,
          // Don't expose secret keys
          secretKey: this.stripeService.getConfig().secretKey
            ? `${this.stripeService.getConfig().secretKey.substring(0, 8)}...`
            : 'Not configured',
          publishableKey: this.stripeService.getConfig().publishableKey
            ? `${this.stripeService.getConfig().publishableKey.substring(0, 8)}...`
            : 'Not configured',
        },
      };
    }
  }
}
