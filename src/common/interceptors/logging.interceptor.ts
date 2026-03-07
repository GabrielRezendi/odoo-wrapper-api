import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpRequest');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const start = Date.now();
    const method = req.method;
    const url = req.originalUrl ?? req.url;
    const userAgent = req.get('user-agent') ?? '-';

    this.logger.log(`--> ${method} ${url} (User-Agent: ${userAgent})`);

    return next.handle().pipe(
      tap({
        next: () => {
          const res = http.getResponse<Response>();
          const statusCode = res.statusCode;
          const duration = Date.now() - start;
          this.logger.log(`<-- ${method} ${url} ${statusCode} ${duration}ms`);
        },
        error: () => {
          const duration = Date.now() - start;
          this.logger.warn(`<-- ${method} ${url} ERROR ${duration}ms`);
        },
      }),
    );
  }
}
