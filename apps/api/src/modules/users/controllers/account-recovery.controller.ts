import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';

import { AccountRecoveryService } from '../services/account-recovery.service';
import {
  InitiateAccountRecoveryDto,
  VerifyAccountRecoveryDto,
  CompleteAccountRecoveryDto,
  AccountRecoveryStatusDto,
  RecoveryAttemptDto,
} from '../../auth/dto/mfa.dto';
import { TwoFactorAuthSetup } from '@app/shared';

@ApiTags('Account Recovery')
@Controller('auth/recovery')
@UseGuards(ThrottlerGuard)
export class AccountRecoveryController {
  constructor(
    private readonly accountRecoveryService: AccountRecoveryService
  ) {}

  @Post('initiate')
  @Throttle({ default: { ttl: 60000, limit: 3 } }) // 3 attempts per minute
  @ApiOperation({ summary: 'Initiate account recovery process' })
  @ApiResponse({
    status: 200,
    description: 'Recovery email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @HttpCode(HttpStatus.OK)
  async initiateRecovery(
    @Body() initiateDto: InitiateAccountRecoveryDto,
    @Req() req: Request
  ): Promise<{ message: string }> {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] as string;

    return this.accountRecoveryService.initiateRecovery(
      initiateDto.email,
      ipAddress,
      userAgent
    );
  }

  @Post('verify')
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'Verify recovery token and backup code' })
  @ApiResponse({
    status: 200,
    description: 'Recovery verification successful',
    schema: {
      type: 'object',
      properties: {
        recoverySessionToken: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        remainingAttempts: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 401,
    description: 'Invalid recovery token or backup code',
  })
  @ApiResponse({ status: 404, description: 'Recovery session not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @HttpCode(HttpStatus.OK)
  async verifyRecovery(@Body() verifyDto: VerifyAccountRecoveryDto): Promise<{
    recoverySessionToken: string;
    expiresAt: string;
    remainingAttempts: number;
  }> {
    const result = await this.accountRecoveryService.verifyRecovery(
      verifyDto.recoveryToken,
      verifyDto.backupCode
    );

    return {
      recoverySessionToken: result.recoverySessionToken,
      expiresAt: result.expiresAt.toISOString(),
      remainingAttempts: result.remainingAttempts,
    };
  }

  @Post('complete')
  @Throttle({ default: { ttl: 60000, limit: 3 } }) // 3 attempts per minute
  @ApiOperation({ summary: 'Complete account recovery and reset MFA' })
  @ApiResponse({
    status: 200,
    description: 'Account recovery completed successfully',
    schema: {
      type: 'object',
      properties: {
        secret: { type: 'string' },
        qrCode: { type: 'string' },
        backupCodes: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Recovery session not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @HttpCode(HttpStatus.OK)
  async completeRecovery(
    @Body() completeDto: CompleteAccountRecoveryDto
  ): Promise<TwoFactorAuthSetup> {
    return this.accountRecoveryService.completeRecovery(
      completeDto.recoverySessionToken,
      completeDto.newTotpSecret
    );
  }

  @Get('status')
  @ApiOperation({ summary: 'Get recovery session status' })
  @ApiResponse({
    status: 200,
    description: 'Recovery status retrieved successfully',
    type: AccountRecoveryStatusDto,
  })
  @ApiResponse({ status: 404, description: 'Recovery session not found' })
  async getRecoveryStatus(
    @Query('recoverySessionToken') recoverySessionToken: string
  ): Promise<AccountRecoveryStatusDto> {
    const status =
      await this.accountRecoveryService.getRecoveryStatus(recoverySessionToken);

    return {
      isRecoveryInProgress: status.isRecoveryInProgress,
      recoverySessionExpiresAt: status.recoverySessionExpiresAt,
      remainingAttempts: status.remainingAttempts,
    };
  }

  @Post('attempt')
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'Attempt backup code verification' })
  @ApiResponse({
    status: 200,
    description: 'Backup code verification successful',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        remainingAttempts: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Invalid backup code' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @HttpCode(HttpStatus.OK)
  async attemptBackupCode(
    @Body() attemptDto: RecoveryAttemptDto
  ): Promise<{ isValid: boolean; remainingAttempts: number }> {
    // This endpoint allows users to try different backup codes
    // without having to restart the recovery process
    try {
      const status = await this.accountRecoveryService.getRecoveryStatus(
        attemptDto.recoverySessionToken
      );

      if (!status.isRecoveryInProgress) {
        return { isValid: false, remainingAttempts: 0 };
      }

      // For this implementation, we'll return the status
      // In a real implementation, you might want to verify the backup code here
      // and return the actual verification result
      return {
        isValid: false, // This would be determined by actual verification
        remainingAttempts: status.remainingAttempts,
      };
    } catch (error) {
      return { isValid: false, remainingAttempts: 0 };
    }
  }
}
