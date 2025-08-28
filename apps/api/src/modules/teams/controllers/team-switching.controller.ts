import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { TenantScopingInterceptor } from '../../../common/interceptors/tenant-scoping.interceptor';
import { TeamSwitchingService } from '../services/team-switching.service';
import {
  TeamSwitchDto,
  TeamSwitchResponseDto,
  UserTeamMembershipsResponseDto,
  CurrentTeamContextDto,
  TeamAccessVerificationDto,
  AvailableTeamsDto,
} from '../dto/team-switch.dto';
import {
  PermissionAction,
  PermissionResource,
} from '../../rbac/entities/permission.entity';

@ApiTags('Team Switching')
@Controller('teams/switch')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(TenantScopingInterceptor)
@ApiBearerAuth()
export class TeamSwitchingController {
  private readonly logger = new Logger(TeamSwitchingController.name);

  constructor(private readonly teamSwitchingService: TeamSwitchingService) {}

  @Post()
  @ApiOperation({
    summary: 'Switch to a different team',
    description: 'Switch the current user to a different team context',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully switched to the specified team',
    type: TeamSwitchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid team ID or request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have access to the specified team',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.READ,
  })
  async switchTeam(
    @Request() req: any,
    @Body() switchDto: TeamSwitchDto,
    @TenantId() tenantId: string
  ): Promise<TeamSwitchResponseDto> {
    const userId = req.user.sub;
    this.logger.debug(`User ${userId} switching to team: ${switchDto.teamId}`);

    return await this.teamSwitchingService.switchTeam(
      userId,
      switchDto,
      tenantId
    );
  }

  @Get('memberships')
  @ApiOperation({
    summary: 'Get user team memberships',
    description: 'Get all teams where the current user is a member',
  })
  @ApiResponse({
    status: 200,
    description: 'User team memberships retrieved successfully',
    type: UserTeamMembershipsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.READ,
  })
  async getUserTeamMemberships(
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<UserTeamMembershipsResponseDto> {
    const userId = req.user.sub;
    this.logger.debug(`Getting team memberships for user: ${userId}`);

    return await this.teamSwitchingService.getUserTeamMemberships(
      userId,
      tenantId
    );
  }

  @Get('current')
  @ApiOperation({
    summary: 'Get current team context',
    description: 'Get the current team context for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Current team context retrieved successfully',
    type: CurrentTeamContextDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 404,
    description: 'No current team context found',
  })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.READ,
  })
  async getCurrentTeamContext(
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<CurrentTeamContextDto> {
    const userId = req.user.sub;
    this.logger.debug(`Getting current team context for user: ${userId}`);

    return await this.teamSwitchingService.getCurrentTeamContext(
      userId,
      tenantId
    );
  }

  @Post(':teamId/verify-access')
  @ApiOperation({
    summary: 'Verify team access',
    description: 'Verify if the current user has access to a specific team',
  })
  @ApiResponse({
    status: 200,
    description: 'Team access verification completed',
    type: TeamAccessVerificationDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID to verify access for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.READ,
  })
  async verifyTeamAccess(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @TenantId() tenantId: string
  ): Promise<TeamAccessVerificationDto> {
    const userId = req.user.sub;
    this.logger.debug(
      `Verifying team access for user ${userId} to team ${teamId}`
    );

    const hasAccess = await this.teamSwitchingService.verifyTeamAccess(
      userId,
      teamId,
      tenantId
    );

    if (!hasAccess) {
      return {
        hasAccess: false,
      };
    }

    // If access is granted, get team and membership details
    const team = await this.teamSwitchingService.getCurrentTeamContext(
      userId,
      tenantId
    );

    return {
      hasAccess: true,
      team: team.team,
      membership: team.membership,
    };
  }

  @Get('available')
  @ApiOperation({
    summary: 'Get available teams for switching',
    description:
      'Get list of teams available for the current user to switch to',
  })
  @ApiResponse({
    status: 200,
    description: 'Available teams retrieved successfully',
    type: AvailableTeamsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.READ,
  })
  async getAvailableTeams(
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<AvailableTeamsDto> {
    const userId = req.user.sub;
    this.logger.debug(`Getting available teams for user: ${userId}`);

    const teams = await this.teamSwitchingService.getAvailableTeams(
      userId,
      tenantId
    );

    return { teams };
  }
}
