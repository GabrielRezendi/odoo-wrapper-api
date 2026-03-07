import { Injectable, NotFoundException } from '@nestjs/common';
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
        throw new NotFoundException(`Ticket ${id} not found`);
      }
      const ticket = result[0] as Record<string, unknown>;
      const rawMessageIds = ticket?.message_ids;
      const messageIds = Array.isArray(rawMessageIds)
        ? rawMessageIds.map((item: unknown) =>
            Array.isArray(item) ? (item[0] as number) : (item as number),
          )
        : [];
      if (messageIds.length > 0) {
        try {
          const messages = (await this.odooRpc.executeKw(
            creds,
            MESSAGE_MODEL,
            'read',
            [[messageIds]],
            { fields: MESSAGE_FIELDS },
          )) as unknown[];
          ticket.messages = Array.isArray(messages) ? messages : [];
        } catch {
          ticket.messages = [];
        }
      } else {
        ticket.messages = [];
      }
      return ticket;
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
