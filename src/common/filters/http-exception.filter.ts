import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    const responseBody =
      typeof message === 'object' && message !== null
        ? message
        : { message: String(message) };

    const stack = exception instanceof Error ? exception.stack : undefined;

    const logMessage = `${request.method} ${request.url} ${status} - ${JSON.stringify(responseBody)}`;

    if (status >= 500 || !(exception instanceof HttpException)) {
      this.logger.error(logMessage, stack ?? undefined);
    } else if (status >= 400) {
      this.logger.warn(logMessage);
    }

    response.status(status).json(responseBody);
  }
}
