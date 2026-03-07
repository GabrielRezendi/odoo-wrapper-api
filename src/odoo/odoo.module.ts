import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OdooJsonRpcService } from './odoo-jsonrpc.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  providers: [OdooJsonRpcService],
  exports: [OdooJsonRpcService],
})
export class OdooModule {}
