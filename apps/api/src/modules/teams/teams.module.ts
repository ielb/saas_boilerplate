import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamController } from './controllers/team.controller';
import { TeamService } from './services/team.service';
import { Team, TeamInvitation } from './entities/team.entity';
import { TeamRepository } from './repositories/team.repository';
import { CommonModule } from '../../common/common.module';
import { UserRepository } from '../users/repositories/user.repository';
import { User } from '../users/entities/user.entity';
import { Role } from '../rbac/entities/role.entity';
import { RoleRepository } from '../rbac/repositories/role.repository';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';
import { TeamMembership } from './entities/team.entity';
import { RBACModule } from '../rbac/rbac.module';
import { AuthJwtModule } from '../auth/jwt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Team,
      User,
      Role,
      TeamMembership,
      TeamInvitation,
    ]),
    CommonModule,
    EmailModule,
    AuditModule,
    RBACModule,
    AuthJwtModule,
  ],
  controllers: [TeamController],
  providers: [TeamService, TeamRepository, UserRepository, RoleRepository],
  exports: [TeamService, TeamRepository, UserRepository, RoleRepository],
})
export class TeamsModule {}
