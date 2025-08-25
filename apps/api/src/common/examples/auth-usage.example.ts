import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  Public,
  SkipAuth,
  Roles,
  Role,
  RequireTenant,
  RequireMfa,
  RequireOwner,
  RequireAdmin,
  RequireManager,
  RequireMember,
  RequireViewer,
  RequireAdminOrOwner,
  RequireManagerOrHigher,
  RequireMemberOrHigher,
} from '../decorators/auth.decorator';
import {
  RequirePermissions,
  RequirePermission,
  RequireCreate,
  RequireRead,
  RequireUpdate,
  RequireDelete,
  RequireManage,
} from '../decorators/permissions.decorator';
import { RolesGuard, TenantGuard, MfaGuard } from '../guards';
import { AuthGuard } from '../../modules/auth/guards/auth.guard';
import { UserRole } from '@app/shared';
import {
  PermissionResource,
  PermissionAction,
} from '../../modules/rbac/entities/permission.entity';

/**
 * Example controller demonstrating how to use authentication guards and decorators
 *
 * This example shows various ways to protect routes with different levels of authentication
 * and authorization requirements.
 */
@ApiTags('Example - Authentication Usage')
@ApiBearerAuth()
@Controller('example-auth')
@UseGuards(AuthGuard) // Apply authentication to all routes in this controller
export class AuthUsageExampleController {
  // ============================================================================
  // PUBLIC ROUTES (No authentication required)
  // ============================================================================

  @Get('public')
  @Public() // Mark route as public - no authentication required
  @ApiOperation({ summary: 'Public route - no authentication required' })
  getPublicData() {
    return { message: 'This is public data' };
  }

  @Get('health')
  @SkipAuth() // Alternative way to skip authentication
  @ApiOperation({ summary: 'Health check - skips authentication' })
  getHealth() {
    return { status: 'healthy' };
  }

  // ============================================================================
  // BASIC AUTHENTICATION (Just requires valid JWT token)
  // ============================================================================

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile - requires authentication' })
  getUserProfile() {
    return { message: 'User profile data' };
  }

  // ============================================================================
  // ROLE-BASED ACCESS CONTROL
  // ============================================================================

  @Get('admin-only')
  @Role(UserRole.ADMIN) // Require specific role
  @ApiOperation({ summary: 'Admin only route' })
  getAdminData() {
    return { message: 'Admin only data' };
  }

  @Get('owner-or-admin')
  @RequireAdminOrOwner() // Require admin or owner role
  @ApiOperation({ summary: 'Owner or admin route' })
  getOwnerOrAdminData() {
    return { message: 'Owner or admin data' };
  }

  @Get('manager-plus')
  @RequireManagerOrHigher() // Require manager or higher role
  @ApiOperation({ summary: 'Manager or higher route' })
  getManagerPlusData() {
    return { message: 'Manager or higher data' };
  }

  @Get('member-plus')
  @RequireMemberOrHigher() // Require member or higher role
  @ApiOperation({ summary: 'Member or higher route' })
  getMemberPlusData() {
    return { message: 'Member or higher data' };
  }

  @Post('users')
  @Roles(UserRole.ADMIN, UserRole.MANAGER) // Require multiple roles
  @ApiOperation({ summary: 'Create user - admin or manager only' })
  createUser(@Body() userData: any) {
    return { message: 'User created', data: userData };
  }

  // ============================================================================
  // TENANT-SCOPED ROUTES
  // ============================================================================

  @Get('tenant-data')
  @RequireTenant() // Require tenant context
  @ApiOperation({ summary: 'Tenant-scoped data' })
  getTenantData() {
    return { message: 'Tenant-specific data' };
  }

  @Get('tenant-users')
  @RequireTenant()
  @RequireManager() // Combine tenant requirement with role requirement
  @ApiOperation({ summary: 'Tenant users - requires tenant and manager role' })
  getTenantUsers() {
    return { message: 'Tenant users list' };
  }

  // ============================================================================
  // MFA-PROTECTED ROUTES
  // ============================================================================

  @Get('sensitive-data')
  @RequireMfa() // Require MFA verification
  @ApiOperation({ summary: 'Sensitive data - requires MFA' })
  getSensitiveData() {
    return { message: 'Sensitive data' };
  }

  @Post('financial-transaction')
  @RequireMfa()
  @RequireAdmin() // Combine MFA with role requirement
  @ApiOperation({
    summary: 'Financial transaction - requires MFA and admin role',
  })
  performFinancialTransaction(@Body() transactionData: any) {
    return { message: 'Transaction completed', data: transactionData };
  }

  // ============================================================================
  // PERMISSION-BASED ACCESS CONTROL
  // ============================================================================

  @Get('users/:id')
  @RequireRead(PermissionResource.USERS) // Require read permission for users
  @ApiOperation({ summary: 'Get user by ID - requires users:read permission' })
  getUserById(@Param('id') id: string) {
    return { message: 'User data', id };
  }

  @Post('users')
  @RequireCreate(PermissionResource.USERS) // Require create permission for users
  @ApiOperation({ summary: 'Create user - requires users:create permission' })
  createNewUser(@Body() userData: any) {
    return { message: 'User created', data: userData };
  }

  @Put('users/:id')
  @RequireUpdate(PermissionResource.USERS) // Require update permission for users
  @ApiOperation({ summary: 'Update user - requires users:update permission' })
  updateUser(@Param('id') id: string, @Body() userData: any) {
    return { message: 'User updated', id, data: userData };
  }

  @Delete('users/:id')
  @RequireDelete(PermissionResource.USERS) // Require delete permission for users
  @ApiOperation({ summary: 'Delete user - requires users:delete permission' })
  deleteUser(@Param('id') id: string) {
    return { message: 'User deleted', id };
  }

  @Get('users')
  @RequireManage(PermissionResource.USERS) // Require manage permission for users
  @ApiOperation({
    summary: 'List all users - requires users:manage permission',
  })
  getAllUsers() {
    return { message: 'All users list' };
  }

  // ============================================================================
  // COMPLEX PERMISSION SCENARIOS
  // ============================================================================

  @Post('users/:id/roles')
  @RequirePermission(
    PermissionResource.USERS,
    PermissionAction.ASSIGN,
    undefined,
    { ownerOnly: true } // Only owner can assign roles
  )
  @ApiOperation({
    summary:
      'Assign role to user - requires users:assign permission and owner condition',
  })
  assignRoleToUser(@Param('id') userId: string, @Body() roleData: any) {
    return { message: 'Role assigned', userId, data: roleData };
  }

  @Get('reports')
  @RequirePermissions(
    { resource: PermissionResource.REPORTS, action: PermissionAction.READ },
    { resource: PermissionResource.USERS, action: PermissionAction.MANAGE } // Alternative permission
  )
  @ApiOperation({
    summary: 'Get reports - requires reports:read OR users:manage permission',
  })
  getReports() {
    return { message: 'Reports data' };
  }

  // ============================================================================
  // COMBINING MULTIPLE GUARDS
  // ============================================================================

  @Post('admin-action')
  @UseGuards(AuthGuard, RolesGuard, TenantGuard, MfaGuard) // Use multiple guards explicitly
  @RequireAdmin()
  @RequireTenant()
  @RequireMfa()
  @RequirePermission(
    PermissionResource.SYSTEM_SETTINGS,
    PermissionAction.MANAGE
  )
  @ApiOperation({
    summary: 'Admin action - requires all guards and permissions',
  })
  performAdminAction(@Body() actionData: any) {
    return { message: 'Admin action performed', data: actionData };
  }

  // ============================================================================
  // CONDITIONAL PERMISSIONS
  // ============================================================================

  @Put('users/:id/profile')
  @RequirePermission(
    PermissionResource.USERS,
    PermissionAction.UPDATE,
    undefined,
    {
      ownerOnly: true, // Only owner can update
      sameTenant: true, // Must be in same tenant
    }
  )
  @ApiOperation({
    summary: 'Update user profile - requires ownership and same tenant',
  })
  updateUserProfile(@Param('id') userId: string, @Body() profileData: any) {
    return { message: 'Profile updated', userId, data: profileData };
  }

  @Delete('users/:id')
  @RequirePermission(
    PermissionResource.USERS,
    PermissionAction.DELETE,
    undefined,
    {
      roleRequired: UserRole.ADMIN, // Only admins can delete
    }
  )
  @ApiOperation({
    summary: 'Delete user - requires admin role and users:delete permission',
  })
  deleteUserWithConditions(@Param('id') userId: string) {
    return { message: 'User deleted with conditions', userId };
  }
}
