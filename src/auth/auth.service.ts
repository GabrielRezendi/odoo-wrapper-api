import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OdooJsonRpcService } from '../odoo/odoo-jsonrpc.service';
import { SessionService } from '../session/session.service';
import { LoginDto } from './dto/login.dto';

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
  ): Promise<{ access_token: string; expires_in: number }> {
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

    return {
      access_token: accessToken,
      expires_in: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    };
  }

  async logout(accessToken: string): Promise<{ success: boolean }> {
    const success = await this.sessionService.invalidate(accessToken);
    return { success };
  }
}
