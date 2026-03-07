import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { OdooModule } from '../odoo/odoo.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [OdooModule, SessionModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
