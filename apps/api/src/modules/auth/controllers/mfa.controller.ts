import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { MfaService } from '../services/mfa.service';
import { AuthService } from '../services/auth.service';
import {
  SetupMfaDto,
  EnableMfaDto,
  DisableMfaDto,
  VerifyMfaDto,
  RegenerateBackupCodesDto,
  MfaStatusDto,
} from '../dto/mfa.dto';
import { TwoFactorAuthSetup } from '@app/shared';

@ApiTags('Multi-Factor Authentication')
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly authService: AuthService
  ) {}

  @Post('setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup two-factor authentication' })
  @ApiResponse({
    status: 201,
    description: 'MFA setup successful',
    schema: {
      type: 'object',
      properties: {
        secret: { type: 'string' },
        qrCode: { type: 'string' },
        backupCodes: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async setupMfa(
    @Body() setupMfaDto: SetupMfaDto
  ): Promise<TwoFactorAuthSetup> {
    const user = await this.authService.getProfile(setupMfaDto.userId);
    return this.mfaService.setupTwoFactorAuth(user);
  }

  @Post('enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  @ApiResponse({
    status: 200,
    description: 'MFA enabled successfully',
  })
  @HttpCode(HttpStatus.OK)
  async enableMfa(
    @Body() enableMfaDto: EnableMfaDto,
    @Request() req: any
  ): Promise<{ message: string }> {
    const user = await this.authService.getProfile(req.user.sub);
    await this.mfaService.enableTwoFactorAuth(user, enableMfaDto.token);
    return { message: 'Two-factor authentication enabled successfully' };
  }

  @Post('disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  @ApiResponse({
    status: 200,
    description: 'MFA disabled successfully',
  })
  @HttpCode(HttpStatus.OK)
  async disableMfa(
    @Body() disableMfaDto: DisableMfaDto,
    @Request() req: any
  ): Promise<{ message: string }> {
    const user = await this.authService.getProfile(req.user.sub);
    await this.mfaService.disableTwoFactorAuth(user, disableMfaDto.token);
    return { message: 'Two-factor authentication disabled successfully' };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify two-factor authentication code' })
  @ApiResponse({
    status: 200,
    description: 'MFA verification successful',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async verifyMfa(
    @Body() verifyMfaDto: VerifyMfaDto
  ): Promise<{ isValid: boolean; message: string }> {
    const user = await this.authService.getProfile(verifyMfaDto.userId);

    if (this.mfaService.hasExceededAttempts(user)) {
      return {
        isValid: false,
        message: 'Too many failed attempts. Please try again later.',
      };
    }

    const isValid = await this.mfaService.verifyTwoFactorAuth(
      user,
      verifyMfaDto.token
    );

    if (isValid) {
      await this.mfaService.resetAttempts(user);
    }

    return {
      isValid,
      message: isValid
        ? 'Verification successful'
        : 'Invalid verification code',
    };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get MFA status' })
  @ApiResponse({
    status: 200,
    description: 'MFA status retrieved successfully',
    type: MfaStatusDto,
  })
  async getMfaStatus(@Request() req: any): Promise<MfaStatusDto> {
    const user = await this.authService.getProfile(req.user.sub);
    return this.mfaService.getTwoFactorStatus(user);
  }

  @Post('backup-codes/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiResponse({
    status: 200,
    description: 'Backup codes regenerated successfully',
    schema: {
      type: 'object',
      properties: {
        backupCodes: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async regenerateBackupCodes(
    @Body() regenerateDto: RegenerateBackupCodesDto,
    @Request() req: any
  ): Promise<{ backupCodes: string[] }> {
    const user = await this.authService.getProfile(req.user.sub);
    const backupCodes = await this.mfaService.regenerateBackupCodes(
      user,
      regenerateDto.token
    );
    return { backupCodes };
  }
}
