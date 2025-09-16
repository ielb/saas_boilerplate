import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class PaymentLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PaymentLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body } = request;
    const user = request.user as User;
    const startTime = Date.now();

    // Log request details
    this.logger.log({
      message: 'Payment request started',
      method,
      url,
      userId: user?.id,
      tenantId: user?.tenantId,
      timestamp: new Date().toISOString(),
      requestBody: this.sanitizeRequestBody(body),
    });

    return next.handle().pipe(
      tap(data => {
        const duration = Date.now() - startTime;

        // Log successful response
        this.logger.log({
          message: 'Payment request completed',
          method,
          url,
          statusCode: response.statusCode,
          duration: `${duration}ms`,
          userId: user?.id,
          tenantId: user?.tenantId,
          timestamp: new Date().toISOString(),
          responseData: this.sanitizeResponseData(data),
        });
      }),
      catchError(error => {
        const duration = Date.now() - startTime;

        // Log error response
        this.logger.error({
          message: 'Payment request failed',
          method,
          url,
          statusCode: error.status || 500,
          duration: `${duration}ms`,
          userId: user?.id,
          tenantId: user?.tenantId,
          timestamp: new Date().toISOString(),
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        });

        throw error;
      })
    );
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };

    // Remove sensitive payment data
    const sensitiveFields = [
      'cardNumber',
      'cvc',
      'expiryMonth',
      'expiryYear',
      'cardToken',
      'paymentMethodToken',
      'clientSecret',
      'secretKey',
      'apiKey',
      'password',
    ];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });

    // Sanitize nested objects
    if (sanitized.card) {
      sanitized.card = {
        ...sanitized.card,
        number: sanitized.card.number ? '**** **** **** ****' : undefined,
        cvc: sanitized.card.cvc ? '***' : undefined,
      };
    }

    if (sanitized.billingDetails) {
      sanitized.billingDetails = {
        ...sanitized.billingDetails,
        email: this.maskEmail(sanitized.billingDetails.email),
        phone: this.maskPhone(sanitized.billingDetails.phone),
      };
    }

    return sanitized;
  }

  private sanitizeResponseData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };

    // // Remove sensitive data from response
    // if (sanitized.clientSecret) {
    //   sanitized.clientSecret = 'sk_test_...';
    // }

    // if (sanitized.stripePaymentIntent) {
    //   sanitized.stripePaymentIntent = {
    //     ...sanitized.stripePaymentIntent,
    //     client_secret: 'sk_test_...',
    //   };
    // }

    if (sanitized.stripePaymentMethod) {
      sanitized.stripePaymentMethod = {
        ...sanitized.stripePaymentMethod,
        card: sanitized.stripePaymentMethod.card
          ? {
              ...sanitized.stripePaymentMethod.card,
              number: '**** **** **** ****',
              cvc: '***',
            }
          : undefined,
      };
    }

    return sanitized;
  }

  private maskEmail(email: string): string {
    if (!email) return email;
    const [localPart, domain] = email.split('@');
    if (localPart && domain) {
      return `${localPart.charAt(0)}***@${domain}`;
    }
    return email;
  }

  private maskPhone(phone: string): string {
    if (!phone) return phone;
    return phone.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
  }
}
