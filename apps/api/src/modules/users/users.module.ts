import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './controllers/users.controller';
import { UserLifecycleController } from './controllers/user-lifecycle.controller';
import { ProfileController } from './controllers/profile.controller';
import { AccountRecoveryController } from './controllers/account-recovery.controller';
import { UsersService } from './services/users.service';
import { UserLifecycleService } from './services/user-lifecycle.service';
import { ProfileService } from './services/profile.service';
import { AccountRecoveryService } from './services/account-recovery.service';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { AccountRecovery } from './entities/account-recovery.entity';
import { UserRepository } from './repositories/user.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { CommonModule } from '../../common/common.module';
import { EmailModule } from '../email/email.module';
import { RBACModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';
import { FilesModule } from '../files/files.module';
import { AuthJwtModule } from '../auth/jwt.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, AccountRecovery]),
    CommonModule,
    EmailModule,
    RBACModule,
    AuditModule,
    FilesModule,
    AuthJwtModule,
    TenantsModule,
  ],
  controllers: [
    UsersController,
    UserLifecycleController,
    ProfileController,
    AccountRecoveryController,
  ],
  providers: [
    UsersService,
    UserLifecycleService,
    ProfileService,
    AccountRecoveryService,
    UserRepository,
    UserProfileRepository,
  ],
  exports: [
    UsersService,
    UserLifecycleService,
    ProfileService,
    AccountRecoveryService,
    UserRepository,
    UserProfileRepository,
  ],
})
export class UsersModule {}
