import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  OdooJsonRpcService,
  OdooCredentials,
} from '../odoo/odoo-jsonrpc.service';

const MODEL = 'helpdesk.ticket';
const TEAM_MODEL = 'helpdesk.team';
const MESSAGE_MODEL = 'mail.message';
const MESSAGE_FIELDS = [
  'id',
  'body',
  'date',
  'author_id',
  'message_type',
  'subject',
  'subtype_id',
  'email_from',
  'reply_to',
];

export interface SearchTicketsParams {
  domain?: unknown[];
  fields?: string[];
  limit?: number;
  offset?: number;
  odoo?: Record<string, unknown>;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(private readonly odooRpc: OdooJsonRpcService) {}

  async search(creds: OdooCredentials, params: SearchTicketsParams = {}) {
    const domain = params.domain ?? [];
    const kwargs: Record<string, unknown> = {};
    if (params.fields?.length) kwargs.fields = params.fields;
    if (params.limit != null) kwargs.limit = params.limit;
    if (params.offset != null) kwargs.offset = params.offset;
    if (params.odoo) Object.assign(kwargs, params.odoo);
    try {
      const result = (await this.odooRpc.executeKw(
        creds,
        MODEL,
        'search_read',
        [domain],
        kwargs,
      )) as unknown[];
      const offset = params.offset ?? 0;
      if (
        Array.isArray(result) &&
        params.limit != null &&
        params.limit > 0 &&
        result.length > params.limit + offset
      ) {
        return result.slice(offset, offset + params.limit);
      }
      return result;
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
    const kwargs: Record<string, unknown> = {};
    if (fields?.length) {
      const baseFields = fields.includes('message_ids')
        ? fields
        : [...fields, 'message_ids'];
      kwargs.fields = baseFields;
    }
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
        throw new NotFoundException(`Ticket ${id} not found`);
      }
      const ticket = result[0] as Record<string, unknown>;
      let messageIds = this.extractMessageIds(ticket?.message_ids);

      if (messageIds.length > 0) {
        try {
          const messages = (await this.odooRpc.executeKw(
            creds,
            MESSAGE_MODEL,
            'read',
            [messageIds],
            { fields: MESSAGE_FIELDS },
          )) as unknown[];
          ticket.messages = Array.isArray(messages) ? messages : [];
        } catch (e) {
          this.logger.warn(
            `mail.message read failed for ticket ${id}: ${e instanceof Error ? e.message : String(e)}`,
          );
          const fallback = await this.fetchMessagesByResId(creds, id);
          ticket.messages = fallback;
        }
      } else {
        this.logger.debug(
          `Ticket ${id}: message_ids empty or missing, trying fallback by res_id`,
        );
        const fallback = await this.fetchMessagesByResId(creds, id);
        ticket.messages = fallback;
      }
      return ticket;
    } catch (e) {
      this.mapOdooError(e);
    }
  }

  private extractMessageIds(raw: unknown): number[] {
    if (raw == null || raw === false) return [];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item: unknown) => {
        if (typeof item === 'number') return item;
        if (Array.isArray(item) && item.length > 0) {
          const id = item[0];
          return typeof id === 'number' ? id : 0;
        }
        return 0;
      })
      .filter((id): id is number => id > 0);
  }

  private async fetchMessagesByResId(
    creds: OdooCredentials,
    ticketId: number,
  ): Promise<unknown[]> {
    try {
      const messages = (await this.odooRpc.executeKw(
        creds,
        MESSAGE_MODEL,
        'search_read',
        [[['res_id', '=', ticketId], ['res_model', '=', MODEL]]],
        { fields: MESSAGE_FIELDS, order: 'date asc' },
      )) as unknown[];
      return Array.isArray(messages) ? messages : [];
    } catch (e) {
      this.logger.warn(
        `mail.message search_read fallback failed for ticket ${ticketId}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return [];
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

  async addResponse(
    creds: OdooCredentials,
    ticketId: number,
    values: Record<string, unknown> & {
      body: string;
      message_type?: string;
      subject?: string;
    },
  ) {
    const kwargs: Record<string, unknown> = {
      body: values.body,
      message_type: values.message_type ?? 'comment',
      subtype_xmlid: 'mail.mt_comment',
    };
    if (values.subject) kwargs.subject = values.subject;
    for (const [k, v] of Object.entries(values)) {
      if (!['body', 'message_type', 'subject'].includes(k) && v !== undefined)
        kwargs[k] = v;
    }
    try {
      await this.odooRpc.executeKw(
        creds,
        MODEL,
        'message_post',
        [[ticketId]],
        kwargs,
      );
      return this.read(creds, ticketId);
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

  async getTeams(
    creds: OdooCredentials,
    params: {
      fields?: string[];
      limit?: number;
      offset?: number;
      odoo?: Record<string, unknown>;
    } = {},
  ) {
    const kwargs: Record<string, unknown> = {};
    if (params.fields?.length) kwargs.fields = params.fields;
    if (params.limit != null) kwargs.limit = params.limit;
    if (params.offset != null) kwargs.offset = params.offset;
    if (params.odoo) Object.assign(kwargs, params.odoo);
    try {
      return await this.odooRpc.executeKw(
        creds,
        TEAM_MODEL,
        'search_read',
        [[]],
        kwargs,
      );
    } catch (e) {
      this.mapOdooError(e);
    }
  }

  private mapOdooError(e: unknown): never {
    if (e instanceof Error) throw e;
    throw new Error(String(e));
  }
}
