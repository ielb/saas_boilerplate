import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RoleRepository } from './repositories/role.repository';
import { UserRepository } from './repositories/user.repository';
import { CommonModule } from '../../common/common.module';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { RoleController } from './controllers/role.controller';
import { User } from '../users/entities/user.entity';
import { AuthJwtModule } from '../auth/jwt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission, User]),
    CommonModule,
    AuthJwtModule,
  ],
  controllers: [RoleController],
  providers: [RoleService, PermissionService, RoleRepository, UserRepository],
  exports: [RoleService, PermissionService, RoleRepository, UserRepository],
})
export class RBACModule {}
