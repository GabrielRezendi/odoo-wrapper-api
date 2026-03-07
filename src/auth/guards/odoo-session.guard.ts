import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  SessionService,
  SessionWithCredentials,
} from '../../session/session.service';

export interface RequestWithOdooSession extends Request {
  odooSession: SessionWithCredentials;
}

@Injectable()
export class OdooSessionGuard implements CanActivate {
  private readonly logger = new Logger(OdooSessionGuard.name);

  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      this.logger.warn(
        `Auth failed: ${request.method} ${request.url} - missing or invalid Authorization header`,
      );
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }
    const token = authHeader.slice(7);
    const session = await this.sessionService.findByToken(token);
    if (!session) {
      this.logger.warn(
        `Auth failed: ${request.method} ${request.url} - invalid or expired token`,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }
    (request as RequestWithOdooSession).odooSession = session;
    return true;
  }
}
