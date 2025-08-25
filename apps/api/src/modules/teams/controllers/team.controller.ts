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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { TenantScopingInterceptor } from '../../../common/interceptors/tenant-scoping.interceptor';
import { TeamService } from '../services/team.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  TeamQueryDto,
  TeamResponseDto,
  AddTeamMemberDto,
  UpdateTeamMemberDto,
  TeamMemberResponseDto,
  InviteTeamMemberDto,
  TeamInvitationResponseDto,
  AcceptTeamInvitationDto,
  TeamAnalyticsDto,
} from '../dto/team.dto';
import {
  PermissionAction,
  PermissionResource,
} from '../../rbac/entities/permission.entity';

@ApiTags('Teams')
@Controller('teams')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(TenantScopingInterceptor)
@ApiBearerAuth()
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.CREATE,
  })
  async createTeam(
    @Body() createTeamDto: CreateTeamDto,
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<TeamResponseDto> {
    return this.teamService.createTeam(createTeamDto, tenantId, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teams with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Teams retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by team name',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'managerId',
    required: false,
    description: 'Filter by manager ID',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.READ,
  })
  async findTeams(
    @Query() query: TeamQueryDto,
    @TenantId() tenantId: string
  ): Promise<{ teams: TeamResponseDto[]; total: number }> {
    return this.teamService.findTeams(query, tenantId);
  }

  @Get('my-teams')
  @ApiOperation({ summary: 'Get teams where the current user is a member' })
  @ApiResponse({
    status: 200,
    description: 'User teams retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.READ,
  })
  async findUserTeams(
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<TeamResponseDto[]> {
    return this.teamService.findUserTeams(req.user.sub, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiResponse({
    status: 200,
    description: 'Team retrieved successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.READ,
  })
  async findTeam(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<TeamResponseDto> {
    return this.teamService.findTeam(id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update team' })
  @ApiResponse({
    status: 200,
    description: 'Team updated successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.UPDATE,
  })
  async updateTeam(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<TeamResponseDto> {
    return this.teamService.updateTeam(
      id,
      updateTeamDto,
      tenantId,
      req.user.sub
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team' })
  @ApiResponse({ status: 204, description: 'Team deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.DELETE,
  })
  async deleteTeam(
    @Param('id') id: string,
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<void> {
    return this.teamService.deleteTeam(id, tenantId, req.user.sub);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get team analytics' })
  @ApiResponse({
    status: 200,
    description: 'Team analytics retrieved successfully',
    type: TeamAnalyticsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.READ,
  })
  async getTeamAnalytics(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<TeamAnalyticsDto> {
    return this.teamService.getTeamAnalytics(id, tenantId);
  }

  // Team Members endpoints
  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to team' })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Team or user not found' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.MANAGE,
  })
  async addTeamMember(
    @Param('id') teamId: string,
    @Body() addMemberDto: AddTeamMemberDto,
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<TeamMemberResponseDto> {
    return this.teamService.addTeamMember(
      teamId,
      addMemberDto,
      tenantId,
      req.user.sub
    );
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get team members' })
  @ApiResponse({
    status: 200,
    description: 'Team members retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by member status',
  })
  @ApiQuery({
    name: 'roleId',
    required: false,
    description: 'Filter by role ID',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.READ,
  })
  async findTeamMembers(
    @Param('id') teamId: string,
    @Query() query: any,
    @TenantId() tenantId: string
  ): Promise<{ members: TeamMemberResponseDto[]; total: number }> {
    return this.teamService.findTeamMembers(teamId, query, tenantId);
  }

  @Put(':id/members/:memberId')
  @ApiOperation({ summary: 'Update team member' })
  @ApiResponse({
    status: 200,
    description: 'Member updated successfully',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Team or member not found' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.MANAGE,
  })
  async updateTeamMember(
    @Param('id') teamId: string,
    @Param('memberId') memberId: string,
    @Body() updateMemberDto: UpdateTeamMemberDto,
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<TeamMemberResponseDto> {
    return this.teamService.updateTeamMember(
      teamId,
      memberId,
      updateMemberDto,
      tenantId,
      req.user.sub
    );
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from team' })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Team or member not found' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove from team' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.MANAGE,
  })
  async removeTeamMember(
    @Param('id') teamId: string,
    @Param('userId') userId: string,
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<void> {
    return this.teamService.removeTeamMember(
      teamId,
      userId,
      tenantId,
      req.user.sub
    );
  }

  // Team Invitations endpoints
  @Post(':id/invitations')
  @ApiOperation({ summary: 'Invite member to team' })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent successfully',
    type: TeamInvitationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.MANAGE,
  })
  async inviteTeamMember(
    @Param('id') teamId: string,
    @Body() inviteDto: InviteTeamMemberDto,
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<TeamInvitationResponseDto> {
    return this.teamService.inviteTeamMember(
      teamId,
      inviteDto,
      tenantId,
      req.user.sub
    );
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'Get team invitations' })
  @ApiResponse({
    status: 200,
    description: 'Team invitations retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by invitation status',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.READ,
  })
  async findTeamInvitations(
    @Param('id') teamId: string,
    @Query() query: any,
    @TenantId() tenantId: string
  ): Promise<{ invitations: TeamInvitationResponseDto[]; total: number }> {
    return this.teamService.findTeamInvitations(teamId, query, tenantId);
  }

  @Put(':id/invitations/:invitationId/cancel')
  @ApiOperation({ summary: 'Cancel team invitation' })
  @ApiResponse({
    status: 204,
    description: 'Invitation cancelled successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Team or invitation not found' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions({
    resource: PermissionResource.TEAMS,
    action: PermissionAction.MANAGE,
  })
  async cancelTeamInvitation(
    @Param('id') teamId: string,
    @Param('invitationId') invitationId: string,
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<void> {
    return this.teamService.cancelTeamInvitation(
      invitationId,
      tenantId,
      req.user.sub
    );
  }

  // Public invitation acceptance endpoint (no auth required)
  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept team invitation' })
  @ApiResponse({
    status: 201,
    description: 'Invitation accepted successfully',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Invalid invitation token' })
  @UseGuards(JwtAuthGuard) // Still require authentication to accept invitation
  async acceptTeamInvitation(
    @Body() acceptDto: AcceptTeamInvitationDto,
    @Request() req: any,
    @TenantId() tenantId: string
  ): Promise<TeamMemberResponseDto> {
    return this.teamService.acceptTeamInvitation(
      acceptDto.token,
      tenantId,
      req.user.sub
    );
  }
}
