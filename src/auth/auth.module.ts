import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OdooModule } from '../odoo/odoo.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [OdooModule, SessionModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
