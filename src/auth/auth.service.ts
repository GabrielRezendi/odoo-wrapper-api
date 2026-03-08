import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OdooJsonRpcService,
  OdooCredentials,
} from '../odoo/odoo-jsonrpc.service';
import { SessionService } from '../session/session.service';
import { LoginDto } from './dto/login.dto';

export interface LoginUserData {
  name: string;
  email: string;
  role: string | null;
  department: string | null;
  isActive: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly odooRpc: OdooJsonRpcService,
    private readonly sessionService: SessionService,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{
    access_token: string;
    expires_in: number;
    user: LoginUserData;
  }> {
    const odooUrl = this.configService.get<string>('ODOO_DEFAULT_URL')?.trim();
    if (!odooUrl) {
      this.logger.error('Login failed: ODOO_DEFAULT_URL is not configured');
      throw new UnauthorizedException('ODOO_DEFAULT_URL is not configured');
    }
    const odooDb = this.configService.get<string>('ODOO_DEFAULT_DB')?.trim();
    if (!odooDb) {
      this.logger.error('Login failed: ODOO_DEFAULT_DB is not configured');
      throw new UnauthorizedException('ODOO_DEFAULT_DB is not configured');
    }
    const baseUrl = odooUrl.replace(/\/$/, '');

    const password = dto.apiKey ?? dto.password;
    if (!password?.length) {
      this.logger.warn(
        `Login failed for user ${dto.username}: password or apiKey is required`,
      );
      throw new UnauthorizedException('password or apiKey is required');
    }
    const uid = await this.odooRpc.authenticate(
      baseUrl,
      odooDb,
      dto.username,
      password,
    );

    if (uid === false || uid === 0) {
      this.logger.warn(
        `Login failed: invalid Odoo credentials for user ${dto.username}`,
      );
      throw new UnauthorizedException('Invalid Odoo credentials');
    }

    const expiresInSeconds = 24 * 60 * 60; // 24h
    const { accessToken, expiresAt } = await this.sessionService.create({
      odooUrl: baseUrl,
      odooDb,
      odooUid: uid,
      odooPassword: password,
      userEmail: dto.username,
      expiresInSeconds,
    });

    const creds: OdooCredentials = {
      odooUrl: baseUrl,
      odooDb,
      odooUid: uid,
      odooPassword: password,
    };
    const user = await this.fetchUserData(creds);

    return {
      access_token: accessToken,
      expires_in: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      user,
    };
  }

  private async fetchUserData(creds: OdooCredentials): Promise<LoginUserData> {
    const users = (await this.odooRpc.executeKw(
      creds,
      'res.users',
      'search_read',
      [[['id', '=', creds.odooUid]]],
      { fields: ['name', 'email', 'login', 'active'] },
    )) as Array<{
      name: string;
      email: string | false;
      login: string;
      active: boolean;
    }>;

    const u = users?.[0];
    const name = u?.name ?? '';
    const email =
      (typeof u?.email === 'string' ? u.email : u?.login) ?? '';
    const isActive = u?.active ?? true;

    let role: string | null = null;
    let department: string | null = null;
    try {
      const employees = (await this.odooRpc.executeKw(
        creds,
        'hr.employee',
        'search_read',
        [[['user_id', '=', creds.odooUid]]],
        { fields: ['job_id', 'job_title', 'department_id'], limit: 1 },
      )) as Array<{
        job_id?: [number, string];
        job_title?: string;
        department_id?: [number, string];
      }>;
      const emp = employees?.[0];
      if (emp) {
        const jobId = emp.job_id;
        const jobTitle = emp.job_title;
        role =
          (typeof jobTitle === 'string' && jobTitle
            ? jobTitle
            : Array.isArray(jobId)
              ? jobId[1]
              : null) ?? null;
        const dept = emp.department_id;
        department = Array.isArray(dept) ? dept[1] : null;
      }
    } catch {
      // hr.employee pode não existir
    }

    return { name, email, role, department, isActive };
  }

  async logout(accessToken: string): Promise<{ success: boolean }> {
    const success = await this.sessionService.invalidate(accessToken);
    return { success };
  }
}
