import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  Delegation,
  DelegationAuditLog,
  DelegationRepository,
} from './entities/delegation.entity';
import { DelegationService } from './services/delegation.service';
import { DelegationController } from './controllers/delegation.controller';
import { User } from '../users/entities/user.entity';
import { Permission } from '../rbac/entities/permission.entity';
import { EmailService } from '../email/services/email.service';
import { AuditService } from '../audit/services/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Delegation,
      DelegationAuditLog,
      User,
      Permission,
    ]),
  ],
  controllers: [DelegationController],
  providers: [
    DelegationService,
    DelegationRepository,
    EmailService,
    AuditService,
  ],
  exports: [DelegationService, DelegationRepository],
})
export class DelegationModule {}
