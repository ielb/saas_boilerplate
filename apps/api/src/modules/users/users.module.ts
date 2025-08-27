import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './controllers/users.controller';
import { UserLifecycleController } from './controllers/user-lifecycle.controller';
import { ProfileController } from './controllers/profile.controller';
import { AccountRecoveryController } from './controllers/account-recovery.controller';
import { BulkUsersController } from './controllers/bulk-users.controller';
import { UsersService } from './services/users.service';
import { UserLifecycleService } from './services/user-lifecycle.service';
import { ProfileService } from './services/profile.service';
import { AccountRecoveryService } from './services/account-recovery.service';
import { BulkUsersImportService } from './services/bulk-users-import.service';
import { BulkUsersExportService } from './services/bulk-users-export.service';
import { BulkOperationsService } from './services/bulk-operations.service';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { AccountRecovery } from './entities/account-recovery.entity';
import { BulkImportJob } from './entities/bulk-import-job.entity';
import { ImportError } from './entities/import-error.entity';
import { UserRepository } from './repositories/user.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { BulkImportJobRepository } from './repositories/bulk-import-job.repository';
import { ImportErrorRepository } from './repositories/import-error.repository';
import { CsvParserUtil } from './utils/csv-parser.util';
import { CsvValidatorUtil } from './utils/csv-validator.util';
import { UserMapperUtil } from './utils/user-mapper.util';
import { CommonModule } from '../../common/common.module';
import { EmailModule } from '../email/email.module';
import { RBACModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';
import { FilesModule } from '../files/files.module';
import { AuthJwtModule } from '../auth/jwt.module';
import { TenantsModule } from '../tenants/tenants.module';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      AccountRecovery,
      BulkImportJob,
      ImportError,
    ]),
    CommonModule,
    EmailModule,
    RBACModule,
    AuditModule,
    FilesModule,
    AuthJwtModule,
    TenantsModule,
    TeamsModule,
  ],
  controllers: [
    UsersController,
    UserLifecycleController,
    ProfileController,
    AccountRecoveryController,
    BulkUsersController,
  ],
  providers: [
    UsersService,
    UserLifecycleService,
    ProfileService,
    AccountRecoveryService,
    BulkUsersImportService,
    BulkUsersExportService,
    BulkOperationsService,
    UserRepository,
    UserProfileRepository,
    BulkImportJobRepository,
    ImportErrorRepository,
    CsvParserUtil,
    CsvValidatorUtil,
    UserMapperUtil,
  ],
  exports: [
    UsersService,
    UserLifecycleService,
    ProfileService,
    AccountRecoveryService,
    BulkUsersImportService,
    BulkUsersExportService,
    BulkOperationsService,
    UserRepository,
    UserProfileRepository,
    BulkImportJobRepository,
    ImportErrorRepository,
  ],
})
export class UsersModule {}
