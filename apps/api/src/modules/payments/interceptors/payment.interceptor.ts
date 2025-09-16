import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class PaymentInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PaymentInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;

    this.logger.log(`Payment request: ${method} ${url}`);

    return next.handle().pipe(
      map(data => {
        // Transform payment response data
        const transformedData = this.transformPaymentData(data);

        this.logger.log(`Payment response: ${method} ${url} - Success`);

        return transformedData;
      })
    );
  }

  private transformPaymentData(data: any): any {
    if (!data) return data;

    // If it's a payment object, mask sensitive data
    if (data.stripePaymentIntent) {
      return {
        ...data,
        stripePaymentIntent: this.maskStripeData(data.stripePaymentIntent),
      };
    }

    // If it's a payment method object, mask sensitive data
    if (data.stripePaymentMethod) {
      return {
        ...data,
        stripePaymentMethod: this.maskStripeData(data.stripePaymentMethod),
      };
    }

    // If it's an array of payments, transform each one
    if (Array.isArray(data)) {
      return data.map(item => this.transformPaymentData(item));
    }

    // If it's a paginated response
    if (data.data && Array.isArray(data.data)) {
      return {
        ...data,
        data: data.data.map((item: any) => this.transformPaymentData(item)),
      };
    }

    return data;
  }

  private maskStripeData(stripeData: any): any {
    if (!stripeData) return stripeData;

    const masked = { ...stripeData };

    // Mask client secret
    if (masked.client_secret) {
      masked.client_secret = 'sk_test_...';
    }

    // Mask payment method details
    if (masked.payment_method) {
      masked.payment_method = this.maskPaymentMethod(masked.payment_method);
    }

    // Mask card details
    if (masked.card) {
      masked.card = this.maskCardDetails(masked.card);
    }

    // Mask billing details
    if (masked.billing_details) {
      masked.billing_details = this.maskBillingDetails(masked.billing_details);
    }

    return masked;
  }

  private maskPaymentMethod(paymentMethod: any): any {
    if (!paymentMethod) return paymentMethod;

    const masked = { ...paymentMethod };

    // Mask card details
    if (masked.card) {
      masked.card = this.maskCardDetails(masked.card);
    }

    // Mask billing details
    if (masked.billing_details) {
      masked.billing_details = this.maskBillingDetails(masked.billing_details);
    }

    return masked;
  }

  private maskCardDetails(card: any): any {
    if (!card) return card;

    return {
      ...card,
      number: card.number
        ? '**** **** **** ' + card.number.slice(-4)
        : undefined,
      cvc: card.cvc ? '***' : undefined,
      fingerprint: card.fingerprint ? '***' : undefined,
    };
  }

  private maskBillingDetails(billingDetails: any): any {
    if (!billingDetails) return billingDetails;

    const masked = { ...billingDetails };

    // Mask email
    if (masked.email) {
      const [localPart, domain] = masked.email.split('@');
      if (localPart && domain) {
        masked.email = `${localPart.charAt(0)}***@${domain}`;
      }
    }

    // Mask phone
    if (masked.phone) {
      masked.phone = masked.phone.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
    }

    // Mask address
    if (masked.address) {
      masked.address = {
        ...masked.address,
        line1: masked.address.line1 ? '***' : undefined,
        line2: masked.address.line2 ? '***' : undefined,
        postal_code: masked.address.postal_code ? '***' : undefined,
      };
    }

    return masked;
  }
}
