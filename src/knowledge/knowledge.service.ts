import { Injectable, NotFoundException } from '@nestjs/common';
import {
  OdooJsonRpcService,
  OdooCredentials,
} from '../odoo/odoo-jsonrpc.service';

const MODEL = 'knowledge.article';

export interface SearchArticlesParams {
  domain?: unknown[];
  fields?: string[];
  limit?: number;
  offset?: number;
  odoo?: Record<string, unknown>;
}

@Injectable()
export class KnowledgeService {
  constructor(private readonly odooRpc: OdooJsonRpcService) {}

  async search(creds: OdooCredentials, params: SearchArticlesParams = {}) {
    const domain = params.domain ?? [];
    const kwargs: Record<string, unknown> = {};
    if (params.fields?.length) kwargs.fields = params.fields;
    if (params.limit != null) kwargs.limit = params.limit;
    if (params.offset != null) kwargs.offset = params.offset;
    if (params.odoo) Object.assign(kwargs, params.odoo);
    try {
      return await this.odooRpc.executeKw(
        creds,
        MODEL,
        'search_read',
        [domain],
        kwargs,
      );
    } catch (e) {
      this.mapOdooError(e);
    }
  }

  async read(
    creds: OdooCredentials,
    id: number,
    fields?: string[],
    odoo?: Record<string, unknown>,
  ) {
    const kwargs: Record<string, unknown> = fields?.length ? { fields } : {};
    if (odoo) Object.assign(kwargs, odoo);
    try {
      const result = (await this.odooRpc.executeKw(
        creds,
        MODEL,
        'read',
        [[id]],
        kwargs,
      )) as unknown[];
      if (!result?.length) {
        throw new NotFoundException(`Article ${id} not found`);
      }
      return result[0];
    } catch (e) {
      this.mapOdooError(e);
    }
  }

  async create(creds: OdooCredentials, values: Record<string, unknown>) {
    try {
      return await this.odooRpc.executeKw(creds, MODEL, 'create', [values]);
    } catch (e) {
      this.mapOdooError(e);
    }
  }

  async update(
    creds: OdooCredentials,
    id: number,
    values: Record<string, unknown>,
  ) {
    try {
      await this.odooRpc.executeKw(creds, MODEL, 'write', [[id], values]);
      return this.read(creds, id);
    } catch (e) {
      this.mapOdooError(e);
    }
  }

  async delete(creds: OdooCredentials, id: number) {
    try {
      await this.odooRpc.executeKw(creds, MODEL, 'unlink', [[id]]);
      return { success: true };
    } catch (e) {
      this.mapOdooError(e);
    }
  }

  private mapOdooError(e: unknown): never {
    if (e instanceof Error) throw e;
    throw new Error(String(e));
  }
}
