import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { OdooSession } from './entities/session.entity';
import { EncryptionService } from '../common/encryption.service';

export interface CreateSessionParams {
  odooUrl: string;
  odooDb: string;
  odooUid: number;
  odooPassword: string;
  userEmail?: string;
  expiresInSeconds?: number;
}

export interface SessionWithCredentials {
  id: string;
  odooUrl: string;
  odooDb: string;
  odooUid: number;
  odooPassword: string;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(OdooSession)
    private readonly sessionRepo: Repository<OdooSession>,
    private readonly encryption: EncryptionService,
  ) {}

  async create(
    params: CreateSessionParams,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const accessToken = randomBytes(32).toString('hex');
    const expiresInSeconds = params.expiresInSeconds ?? 24 * 60 * 60; // 24h default
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await this.sessionRepo.save({
      accessToken,
      odooUrl: params.odooUrl,
      odooDb: params.odooDb,
      odooUid: params.odooUid,
      odooPasswordEncrypted: this.encryption.encrypt(params.odooPassword),
      userEmail: params.userEmail ?? null,
      expiresAt,
    });

    return { accessToken, expiresAt };
  }

  async findByToken(
    accessToken: string,
  ): Promise<SessionWithCredentials | null> {
    const session = await this.sessionRepo.findOne({
      where: { accessToken },
    });
    if (!session || new Date() > session.expiresAt) {
      return null;
    }
    return {
      id: session.id,
      odooUrl: session.odooUrl,
      odooDb: session.odooDb,
      odooUid: session.odooUid,
      odooPassword: this.encryption.decrypt(session.odooPasswordEncrypted),
    };
  }

  async invalidate(accessToken: string): Promise<boolean> {
    const result = await this.sessionRepo.delete({ accessToken });
    return (result.affected ?? 0) > 0;
  }
}
