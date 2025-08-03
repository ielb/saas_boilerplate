import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtService } from './services/jwt.service';
import { EmailService } from './services/email.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, Tenant } from './entities';
import { env } from '@app/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant]),
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: {
        expiresIn: env.JWT_EXPIRES_IN,
        issuer: 'saas-boilerplate',
        audience: 'saas-boilerplate-users',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtService, EmailService, JwtAuthGuard, JwtStrategy],
  exports: [AuthService, JwtService, EmailService, JwtAuthGuard],
})
export class AuthModule {}
