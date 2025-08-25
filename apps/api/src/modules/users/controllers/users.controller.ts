import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../rbac/guards/roles.guard';
import { Roles } from '../../rbac/decorators/roles.decorator';
import { UserRole } from '@app/shared';
import { TenantAccessGuard } from '../../tenants/guards/tenant-access.guard';
import { Tenant } from '../../../common/decorators/tenant.decorator';
import { AuditInterceptor } from '../../audit/interceptors/audit.interceptor';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@UseInterceptors(AuditInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  create(@Body() createUserDto: CreateUserDto, @Tenant() tenantId: string) {
    return this.usersService.create(createUserDto, tenantId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  findAll(@Query() query: UserQueryDto, @Tenant() tenantId: string) {
    return this.usersService.findAll(query, tenantId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  findOne(@Param('id') id: string, @Tenant() tenantId: string) {
    return this.usersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Tenant() tenantId: string
  ) {
    return this.usersService.update(id, updateUserDto, tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  remove(@Param('id') id: string, @Tenant() tenantId: string) {
    return this.usersService.remove(id, tenantId);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  activate(@Param('id') id: string, @Tenant() tenantId: string) {
    return this.usersService.activate(id, tenantId);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  deactivate(@Param('id') id: string, @Tenant() tenantId: string) {
    return this.usersService.deactivate(id, tenantId);
  }
}
