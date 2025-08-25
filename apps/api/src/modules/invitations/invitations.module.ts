import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationController } from './controllers/invitation.controller';
import { InvitationService } from './services/invitation.service';
import { EmailModule } from '../email/email.module';
import { Invitation } from './entities/invitation.entity';
import { InvitationRepository } from './repositories/invitation.repository';
import { CommonModule } from '../../common/common.module';
import { UserRepository } from '../users/repositories/user.repository';
import { User } from '../users/entities/user.entity';
import { Role } from '../rbac/entities/role.entity';
import { RoleRepository } from '../rbac/repositories/role.repository';
import { RBACModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';
import { AuthJwtModule } from '../auth/jwt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation, User, Role]),
    CommonModule,
    EmailModule,
    RBACModule,
    AuditModule,
    AuthJwtModule,
  ],
  controllers: [InvitationController],
  providers: [
    InvitationService,
    InvitationRepository,
    UserRepository,
    RoleRepository,
  ],
  exports: [InvitationService, InvitationRepository],
})
export class InvitationsModule {}
