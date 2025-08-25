import { Module } from '@nestjs/common';
import { EmailService } from './services/email.service';

@Module({
  controllers: [],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
