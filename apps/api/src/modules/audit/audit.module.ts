import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './services/audit.service';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { CommonModule } from '../../common/common.module';
import { UserRepository } from '../users/repositories/user.repository';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User]), CommonModule],
  providers: [
    AuditService,
    AuditInterceptor,
    AuditLogRepository,
    UserRepository,
  ],
  exports: [AuditService, AuditInterceptor, AuditLogRepository],
})
export class AuditModule {}
