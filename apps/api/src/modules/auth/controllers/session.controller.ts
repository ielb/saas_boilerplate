import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SessionService } from '../services/session.service';
import {
  SessionResponseDto,
  SessionListResponseDto,
  UpdateSessionDto,
  RevokeSessionDto,
} from '../dto/session.dto';
import { Request } from 'express';

@ApiTags('Sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @ApiOperation({ summary: 'Get all sessions for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of user sessions',
    type: SessionListResponseDto,
  })
  async getUserSessions(@Req() req: Request): Promise<SessionListResponseDto> {
    const userId = (req.user as any)?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const sessions = await this.sessionService.getUserSessions(userId);
    const stats = await this.sessionService.getSessionStats(userId);

    return {
      sessions: sessions.map(session => ({
        ...session,
        isActive: session.isActive(),
      })) as any,
      total: stats.total,
      activeCount: stats.active,
      trustedCount: stats.trusted,
    };
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active sessions for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of active user sessions',
    type: [SessionResponseDto],
  })
  async getActiveSessions(@Req() req: Request): Promise<SessionResponseDto[]> {
    const userId = (req.user as any).id;
    const sessions = await this.sessionService.getActiveSessions(userId);

    return sessions.map(session => ({
      ...session,
      isActive: session.isActive(),
    })) as any;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific session by ID' })
  @ApiResponse({
    status: 200,
    description: 'Session details',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getSession(
    @Param('id') sessionId: string
  ): Promise<SessionResponseDto> {
    const session = await this.sessionService.getSession(sessionId);
    return {
      ...session,
      isActive: session.isActive(),
    } as any;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update session information' })
  @ApiResponse({
    status: 200,
    description: 'Session updated successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async updateSession(
    @Param('id') sessionId: string,
    @Body() updateSessionDto: UpdateSessionDto
  ): Promise<SessionResponseDto> {
    const session = await this.sessionService.updateSession(
      sessionId,
      updateSessionDto
    );
    return {
      ...session,
      isActive: session.isActive(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a session' })
  @ApiResponse({
    status: 204,
    description: 'Session revoked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async revokeSession(
    @Param('id') sessionId: string,
    @Body() revokeSessionDto: RevokeSessionDto
  ): Promise<void> {
    await this.sessionService.revokeSession(sessionId, revokeSessionDto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all sessions for the current user' })
  @ApiResponse({
    status: 204,
    description: 'All sessions revoked successfully',
  })
  async revokeAllSessions(
    @Req() req: Request,
    @Body() revokeSessionDto: RevokeSessionDto
  ): Promise<void> {
    const userId = (req.user as any)?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    await this.sessionService.revokeAllUserSessions(
      userId,
      revokeSessionDto.reason
    );
  }

  @Delete('others')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all other sessions except the current one' })
  @ApiResponse({
    status: 204,
    description: 'Other sessions revoked successfully',
  })
  async revokeOtherSessions(
    @Req() req: Request,
    @Body() revokeSessionDto: RevokeSessionDto
  ): Promise<void> {
    const userId = (req.user as any)?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const currentSessionId = req.headers['x-session-id'] as string;

    if (!currentSessionId) {
      throw new Error('Current session ID is required');
    }

    await this.sessionService.revokeOtherSessions(
      userId,
      currentSessionId,
      revokeSessionDto.reason
    );
  }

  @Post(':id/trust')
  @ApiOperation({ summary: 'Mark a device as trusted' })
  @ApiResponse({
    status: 200,
    description: 'Device marked as trusted',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async markDeviceAsTrusted(
    @Param('id') sessionId: string
  ): Promise<SessionResponseDto> {
    const session = await this.sessionService.markDeviceAsTrusted(sessionId);
    return {
      ...session,
      isActive: session.isActive(),
    };
  }

  @Post(':id/activity')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update session activity' })
  @ApiResponse({
    status: 204,
    description: 'Session activity updated',
  })
  @ApiResponse({
    status: 400,
    description: 'Session is not active',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async updateSessionActivity(@Param('id') sessionId: string): Promise<void> {
    await this.sessionService.updateSessionActivity(sessionId);
  }

  @Post(':id/extend')
  @ApiOperation({ summary: 'Extend session expiration' })
  @ApiResponse({
    status: 200,
    description: 'Session extended successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Session is not active',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async extendSession(
    @Param('id') sessionId: string,
    @Body() body: { additionalMinutes: number }
  ): Promise<SessionResponseDto> {
    const session = await this.sessionService.extendSession(
      sessionId,
      body.additionalMinutes
    );
    return {
      ...session,
      isActive: session.isActive(),
    };
  }

  @Post(':id/suspicious')
  @ApiOperation({ summary: 'Mark session as suspicious' })
  @ApiResponse({
    status: 200,
    description: 'Session marked as suspicious',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async markSessionAsSuspicious(
    @Param('id') sessionId: string
  ): Promise<SessionResponseDto> {
    const session =
      await this.sessionService.markSessionAsSuspicious(sessionId);
    return {
      ...session,
      isActive: session.isActive(),
    };
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get session statistics for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Session statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        active: { type: 'number' },
        trusted: { type: 'number' },
        suspicious: { type: 'number' },
        expired: { type: 'number' },
        revoked: { type: 'number' },
      },
    },
  })
  async getSessionStats(@Req() req: Request) {
    const userId = (req.user as any)?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.sessionService.getSessionStats(userId);
  }
}
