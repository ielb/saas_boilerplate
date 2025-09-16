import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class WebhookRateLimitGuard extends ThrottlerGuard {
  private readonly logger = new Logger(WebhookRateLimitGuard.name);

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await super.canActivate(context);
      return result;
    } catch (error: any) {
      this.logger.warn(`Webhook rate limit exceeded: ${error.message}`);
      throw new HttpException(
        'Webhook rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  protected override async getTracker(
    req: Record<string, any>
  ): Promise<string> {
    // Use IP address for rate limiting webhooks
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  protected override generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string
  ): string {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress || 'unknown';

    // Create a more specific key for webhook endpoints
    return `webhook-${ip}-${suffix}-${name}`;
  }
}
