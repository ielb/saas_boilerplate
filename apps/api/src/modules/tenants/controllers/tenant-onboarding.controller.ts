import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';

import { TenantOnboardingService } from '../services/tenant-onboarding.service';
import { AuditInterceptor } from '../../audit/interceptors/audit.interceptor';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/auth.decorator';
import { UserRole } from '@app/shared';
import {
  AuditEvent,
  AuditEventConfig,
} from '../../audit/interceptors/audit.interceptor';
import { AuditEventType } from '../../audit/entities/audit-log.entity';
import {
  TenantOnboardingDto,
  OnboardingProgressDto,
  VerifyOnboardingDto,
  ResendVerificationDto,
  CancelOnboardingDto,
  OnboardingResponseDto,
} from '../dto/tenant-onboarding.dto';

// Define audit configurations for onboarding events
export const OnboardingAuditConfigs = {
  ONBOARDING_STARTED: {
    eventType: AuditEventType.TENANT_CREATED,
    extractUserId: (req: any, result?: any) => result?.adminUserId || undefined,
    extractUserEmail: (req: any, result?: any) =>
      req.body?.adminUser?.email || undefined,
    extractMetadata: (req: any, result?: any) => ({
      action: 'onboarding_started',
      resource: 'tenant_onboarding',
      description: 'Tenant onboarding process started',
      onboardingId: result?.onboardingId,
      tenantId: result?.tenantId,
      tenantName: req.body?.name,
    }),
  },
  ONBOARDING_VERIFIED: {
    eventType: AuditEventType.TENANT_VERIFIED,
    extractMetadata: (req: any, result?: any) => ({
      action: 'onboarding_verified',
      resource: 'tenant_onboarding',
      description: 'Tenant onboarding email verified',
      onboardingId: result?.onboardingId,
    }),
  },
  ONBOARDING_CANCELLED: {
    eventType: AuditEventType.TENANT_DELETED,
    extractMetadata: (req: any, result?: any) => ({
      action: 'onboarding_cancelled',
      resource: 'tenant_onboarding',
      description: 'Tenant onboarding process cancelled',
      onboardingId: req.params?.id,
    }),
  },
  VERIFICATION_RESENT: {
    eventType: AuditEventType.EMAIL_VERIFICATION_SENT,
    extractMetadata: (req: any, result?: any) => ({
      action: 'verification_resent',
      resource: 'tenant_onboarding',
      description: 'Onboarding verification email resent',
      onboardingId: req.params?.id,
    }),
  },
};

@ApiTags('tenant-onboarding')
@Controller('tenants/onboarding')
export class TenantOnboardingController {
  constructor(private readonly onboardingService: TenantOnboardingService) {}

  @Post()
  @UseInterceptors(AuditInterceptor)
  @AuditEvent(OnboardingAuditConfigs.ONBOARDING_STARTED)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start tenant onboarding process',
    description:
      'Initiates the multi-step tenant onboarding workflow including tenant creation, admin user setup, and email verification.',
  })
  @ApiResponse({
    status: 201,
    description: 'Onboarding process started successfully',
    type: OnboardingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid onboarding data',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - tenant name, domain, or admin email already exists',
  })
  async startOnboarding(
    @Body() onboardingDto: TenantOnboardingDto,
    @Req() request: Request
  ): Promise<OnboardingResponseDto> {
    const ipAddress = this.extractIpAddress(request);
    const userAgent = request.get('User-Agent');

    return await this.onboardingService.startOnboarding(
      onboardingDto,
      ipAddress,
      userAgent
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get onboarding progress',
    description:
      'Retrieves the current status and progress of a tenant onboarding process.',
  })
  @ApiParam({
    name: 'id',
    description: 'Onboarding session ID',
    example: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding progress retrieved successfully',
    type: OnboardingProgressDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid onboarding ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Onboarding session not found',
  })
  async getOnboardingProgress(
    @Param('id') onboardingId: string
  ): Promise<OnboardingProgressDto> {
    return await this.onboardingService.getOnboardingProgress(onboardingId);
  }

  @Post(':id/verify')
  @UseInterceptors(AuditInterceptor)
  @AuditEvent(OnboardingAuditConfigs.ONBOARDING_VERIFIED)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify onboarding email',
    description:
      'Verifies the admin user email address using the token sent during onboarding and completes the process.',
  })
  @ApiParam({
    name: 'id',
    description: 'Onboarding session ID',
    example: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully, onboarding completed',
    type: OnboardingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - invalid verification token or onboarding not in verification step',
  })
  @ApiResponse({
    status: 404,
    description: 'Onboarding session not found',
  })
  async verifyOnboarding(
    @Param('id') onboardingId: string,
    @Body() verifyDto: VerifyOnboardingDto
  ): Promise<OnboardingResponseDto> {
    // Ensure the onboarding ID matches
    if (verifyDto.onboardingId !== onboardingId) {
      throw new BadRequestException('Onboarding ID mismatch');
    }

    return await this.onboardingService.verifyOnboarding(verifyDto);
  }

  @Post(':id/resend-verification')
  @UseInterceptors(AuditInterceptor)
  @AuditEvent(OnboardingAuditConfigs.VERIFICATION_RESENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend verification email',
    description:
      'Resends the verification email for the onboarding process with a new token.',
  })
  @ApiParam({
    name: 'id',
    description: 'Onboarding session ID',
    example: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Verification email sent successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - onboarding not in verification step or already verified',
  })
  @ApiResponse({
    status: 404,
    description: 'Onboarding session not found',
  })
  async resendVerification(
    @Param('id') onboardingId: string,
    @Body() resendDto: ResendVerificationDto
  ): Promise<{ message: string }> {
    // Ensure the onboarding ID matches
    if (resendDto.onboardingId !== onboardingId) {
      throw new BadRequestException('Onboarding ID mismatch');
    }

    return await this.onboardingService.resendVerification(resendDto);
  }

  @Delete(':id')
  @UseInterceptors(AuditInterceptor)
  @AuditEvent(OnboardingAuditConfigs.ONBOARDING_CANCELLED)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel onboarding process',
    description:
      'Cancels an ongoing onboarding process and optionally cleans up created resources.',
  })
  @ApiParam({
    name: 'id',
    description: 'Onboarding session ID',
    example: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding cancelled successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Onboarding cancelled successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - onboarding already completed or cancelled',
  })
  @ApiResponse({
    status: 404,
    description: 'Onboarding session not found',
  })
  async cancelOnboarding(
    @Param('id') onboardingId: string,
    @Body() cancelDto: CancelOnboardingDto
  ): Promise<{ message: string }> {
    // Ensure the onboarding ID matches
    if (cancelDto.onboardingId !== onboardingId) {
      throw new BadRequestException('Onboarding ID mismatch');
    }

    return await this.onboardingService.cancelOnboarding(cancelDto);
  }

  // Admin-only endpoints for managing onboarding processes
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all onboarding sessions (Admin only)',
    description:
      'Retrieves a list of all tenant onboarding sessions. Requires admin or owner role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding sessions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        onboardingSessions: {
          type: 'array',
          items: { $ref: '#/components/schemas/OnboardingProgressDto' },
        },
        total: {
          type: 'number',
          example: 25,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin or owner role required',
  })
  async getAllOnboardingSessions(): Promise<{
    onboardingSessions: OnboardingProgressDto[];
    total: number;
  }> {
    // TODO: Implement pagination and filtering
    // This is a placeholder for admin functionality
    throw new BadRequestException(
      'Admin onboarding management not yet implemented'
    );
  }

  @Put(':id/admin/complete')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force complete onboarding (Admin only)',
    description:
      'Administratively completes an onboarding process, bypassing verification steps. Requires admin or owner role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Onboarding session ID',
    example: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding force completed successfully',
    type: OnboardingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - onboarding already completed or cancelled',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin or owner role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Onboarding session not found',
  })
  async forceCompleteOnboarding(
    @Param('id') onboardingId: string
  ): Promise<OnboardingResponseDto> {
    // TODO: Implement admin force completion
    // This is a placeholder for admin functionality
    throw new BadRequestException('Admin force completion not yet implemented');
  }

  @Get(':id/health')
  @ApiOperation({
    summary: 'Health check for onboarding process',
    description:
      'Checks the health and status of an onboarding process, useful for monitoring.',
  })
  @ApiParam({
    name: 'id',
    description: 'Onboarding session ID',
    example: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding health check successful',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'healthy',
          enum: ['healthy', 'warning', 'error'],
        },
        onboardingId: {
          type: 'string',
          example: 'uuid',
        },
        currentStep: {
          type: 'string',
          example: 'verification',
        },
        issues: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: ['Verification token expired'],
        },
        lastActivity: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Onboarding session not found',
  })
  async checkOnboardingHealth(@Param('id') onboardingId: string): Promise<{
    status: 'healthy' | 'warning' | 'error';
    onboardingId: string;
    currentStep: string;
    issues: string[];
    lastActivity: Date;
  }> {
    const progress =
      await this.onboardingService.getOnboardingProgress(onboardingId);

    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'error' = 'healthy';

    // Check for common issues
    if (progress.status === 'failed') {
      status = 'error';
      issues.push('Onboarding process has failed');
    } else if (progress.status === 'cancelled') {
      status = 'warning';
      issues.push('Onboarding process was cancelled');
    } else if (progress.currentStep === 'verification') {
      // Check if verification has been pending too long (24+ hours)
      const hoursSinceEstimated = progress.estimatedCompletion
        ? (Date.now() - progress.estimatedCompletion.getTime()) /
          (1000 * 60 * 60)
        : 0;

      if (hoursSinceEstimated > 24) {
        status = 'warning';
        issues.push('Verification has been pending for more than 24 hours');
      }
    }

    return {
      status,
      onboardingId: progress.onboardingId,
      currentStep: progress.currentStep,
      issues,
      lastActivity: progress.estimatedCompletion || new Date(),
    };
  }

  /**
   * Extract IP address from request
   */
  private extractIpAddress(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      (request.connection as any)?.socket?.remoteAddress ||
      '127.0.0.1'
    );
  }
}
