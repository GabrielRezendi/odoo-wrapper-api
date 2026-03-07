import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { OdooModule } from '../odoo/odoo.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [OdooModule, SessionModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
})
export class KnowledgeModule {}
