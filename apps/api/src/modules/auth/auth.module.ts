import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { MfaController } from './controllers/mfa.controller';
import { SessionController } from './controllers/session.controller';

// Services
import { AuthService } from './services/auth.service';
import { JwtService } from './services/jwt.service';
import { MfaService } from './services/mfa.service';
import { SessionService } from './services/session.service';
import { RefreshTokenService } from './services/refresh-token.service';

// Entities
import { User } from '../users/entities/user.entity';
import { Session } from './entities/session.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Tenant } from '../tenants/entities';

// Repositories
import { UserRepository } from '../users/repositories/user.repository';
import { SessionRepository } from './repositories/session.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Common Module
import { CommonModule } from '../../common/common.module';

// Import other modules
import { UsersModule } from '../users/users.module';
import { RBACModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { AuthJwtModule } from './jwt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, RefreshToken, Tenant]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuthJwtModule,
    CommonModule,
    RBACModule,
    AuditModule,
    EmailModule,
  ],
  controllers: [AuthController, MfaController, SessionController],
  providers: [
    AuthService,
    MfaService,
    SessionService,
    RefreshTokenService,
    JwtStrategy,
    JwtAuthGuard,
    UserRepository,
    SessionRepository,
    RefreshTokenRepository,
  ],
  exports: [
    AuthService,
    MfaService,
    SessionService,
    RefreshTokenService,
    JwtAuthGuard,
    UserRepository,
    SessionRepository,
    RefreshTokenRepository,
  ],
})
export class AuthModule {}
