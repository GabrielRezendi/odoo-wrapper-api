import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface OdooCredentials {
  odooUrl: string;
  odooDb: string;
  odooUid: number;
  odooPassword: string;
}

interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params: {
    service?: string;
    method?: string;
    args?: unknown[];
    kwargs?: Record<string, unknown>;
  };
  id: number;
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

@Injectable()
export class OdooJsonRpcService {
  private requestId = 0;
  private readonly logger = new Logger(OdooJsonRpcService.name);

  constructor(private readonly httpService: HttpService) {}

  private nextId(): number {
    return ++this.requestId;
  }

  async call<T>(
    odooUrl: string,
    service: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {},
  ): Promise<T> {
    const url = odooUrl.replace(/\/$/, '') + '/jsonrpc';
    // Odoo 19 expects params.args = flat [db, uid, passwd, model, method, ...method_args]
    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service,
        method,
        args,
        kwargs: Object.keys(kwargs).length ? kwargs : undefined,
      },
      id: this.nextId(),
    };

    const response = await firstValueFrom(
      this.httpService.post<JsonRpcResponse<T>>(url, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
        validateStatus: () => true,
      }),
    );

    const data = response.data;
    if (data.error) {
      const msg = data.error.message || 'Odoo RPC error';
      const errorDetail = data.error.data
        ? ` data=${JSON.stringify(data.error.data)}`
        : '';
      this.logger.error(
        `Odoo RPC error: ${url} service=${service} method=${method} code=${data.error.code} message=${msg}${errorDetail}`,
      );
      if (
        msg.includes('Authentication') ||
        msg.includes('access denied') ||
        data.error.code === 402
      ) {
        throw new HttpException({ message: msg }, HttpStatus.UNAUTHORIZED);
      }
      if (data.error.code === 403) {
        throw new HttpException({ message: msg }, HttpStatus.FORBIDDEN);
      }
      throw new HttpException(
        { message: msg, data: data.error.data },
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (response.status !== 200) {
      this.logger.error(
        `Odoo request failed: ${url} status=${response.status}`,
      );
      throw new HttpException('Odoo request failed', HttpStatus.BAD_GATEWAY);
    }

    this.logOdooTelemetry(url, service, method, args, data.result);
    return data.result as T;
  }

  private logOdooTelemetry(
    url: string,
    service: string,
    method: string,
    args: unknown[],
    result: unknown,
  ): void {
    const telemetry: Record<string, unknown> = {
      odooUrl: url,
      service,
      method,
    };
    if (service === 'object' && method === 'execute_kw' && args.length >= 5) {
      telemetry.model = args[3];
      telemetry.odooMethod = args[4];
    }
    if (Array.isArray(result)) {
      telemetry.resultType = 'array';
      telemetry.resultCount = result.length;
    } else if (typeof result === 'number') {
      telemetry.resultType = 'number';
      telemetry.resultValue = result;
    } else if (typeof result === 'boolean') {
      telemetry.resultType = 'boolean';
      telemetry.resultValue = result;
    } else if (result !== null && typeof result === 'object') {
      telemetry.resultType = 'object';
      telemetry.resultKeys = Object.keys(result).length;
    } else {
      telemetry.resultType = typeof result;
    }
    this.logger.log(`Odoo telemetry: ${JSON.stringify(telemetry)}`);
  }

  async authenticate(
    odooUrl: string,
    db: string,
    username: string,
    password: string,
  ): Promise<number | false> {
    const uid = await this.call<number | false>(
      odooUrl,
      'common',
      'authenticate',
      [db, username, password, {}],
    );
    return uid;
  }

  async executeKw(
    creds: OdooCredentials,
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {},
  ): Promise<unknown> {
    // Odoo execute_kw(db, uid, password, model, method, args, kwargs)
    // 6th = method's positional args (as list), 7th = method's kwargs (as dict)
    const fullArgs: unknown[] = [
      creds.odooDb,
      creds.odooUid,
      creds.odooPassword,
      model,
      method,
      args,
      kwargs,
    ];
    return this.call(creds.odooUrl, 'object', 'execute_kw', fullArgs, {});
  }
}
