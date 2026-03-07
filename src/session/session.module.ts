import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OdooSession } from './entities/session.entity';
import { SessionService } from './session.service';

@Module({
  imports: [TypeOrmModule.forFeature([OdooSession])],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
