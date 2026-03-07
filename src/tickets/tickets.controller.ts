import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { RequestWithOdooSession } from '../auth/guards/odoo-session.guard';
import { OdooSessionGuard } from '../auth/guards/odoo-session.guard';
import { mergeOdoo, parseOdooQuery } from '../common/odoo-merge.util';
import {
  parseIdParam,
  parseLimit,
  parseOffset,
} from '../common/validation.util';
import { TicketsService } from './tickets.service';
import { AddTicketResponseDto } from './dto/add-ticket-response.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@ApiTags('Tickets (Chamados)')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(OdooSessionGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List helpdesk tickets' })
  @ApiQuery({
    name: 'teamId',
    required: true,
    description: 'Helpdesk team ID to filter tickets',
  })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'fields', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({
    name: 'odoo',
    required: false,
    description:
      'JSON object with extra search_read kwargs (e.g. order, context)',
  })
  async findAll(
    @Query() query: Record<string, string>,
    @Req() req: RequestWithOdooSession,
  ) {
    const teamId = query.teamId?.trim();
    if (!teamId) {
      throw new BadRequestException('teamId is required');
    }
    const teamIdNum = parseInt(teamId, 10);
    if (Number.isNaN(teamIdNum)) {
      throw new BadRequestException('teamId must be a valid number');
    }
    const domain: unknown[] = [['team_id', '=', teamIdNum]];
    if (query.state) {
      const stateNum = parseInt(query.state, 10);
      if (!Number.isNaN(stateNum)) domain.push(['stage_id', '=', stateNum]);
    }
    const limit = parseLimit(query.limit);
    const offset = parseOffset(query.offset);
    const fields = query.fields ? query.fields.split(',') : undefined;
    const odoo = parseOdooQuery(query.odoo);
    return this.ticketsService.search(req.odooSession, {
      domain,
      limit,
      offset,
      fields,
      odoo,
    });
  }

  @Get('teams')
  @ApiOperation({ summary: 'List helpdesk teams' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'fields', required: false })
  @ApiQuery({
    name: 'odoo',
    required: false,
    description: 'JSON object with extra search_read kwargs',
  })
  async getTeams(
    @Query() query: Record<string, string>,
    @Req() req: RequestWithOdooSession,
  ) {
    const limit = parseLimit(query.limit);
    const offset = parseOffset(query.offset);
    const fields = query.fields ? query.fields.split(',') : undefined;
    const odoo = parseOdooQuery(query.odoo);
    return this.ticketsService.getTeams(req.odooSession, {
      limit,
      offset,
      fields,
      odoo,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiParam({ name: 'id' })
  @ApiQuery({
    name: 'odoo',
    required: false,
    description: 'JSON object with extra read kwargs',
  })
  async findOne(
    @Param('id') id: string,
    @Query('odoo') odooStr: string | undefined,
    @Req() req: RequestWithOdooSession,
  ) {
    const odoo = parseOdooQuery(odooStr);
    return this.ticketsService.read(
      req.odooSession,
      parseIdParam(id),
      undefined,
      odoo,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create ticket' })
  @ApiResponse({ status: 201 })
  async create(
    @Body() dto: CreateTicketDto,
    @Req() req: RequestWithOdooSession,
  ) {
    const { teamId, odoo, ...rest } = dto;
    const base = { ...rest, team_id: teamId } as Record<string, unknown>;
    const values = mergeOdoo(base, odoo);
    return this.ticketsService.create(req.odooSession, values);
  }

  @Post(':id/responses')
  @ApiOperation({ summary: 'Add response to ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200 })
  async addResponse(
    @Param('id') id: string,
    @Body() dto: AddTicketResponseDto,
    @Req() req: RequestWithOdooSession,
  ) {
    const base = {
      body: dto.body,
      message_type: dto.message_type,
      subject: dto.subject,
    };
    const values = mergeOdoo(base as Record<string, unknown>, dto.odoo) as {
      body: string;
      message_type?: string;
      subject?: string;
    };
    return this.ticketsService.addResponse(
      req.odooSession,
      parseIdParam(id),
      values,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket' })
  @ApiParam({ name: 'id' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @Req() req: RequestWithOdooSession,
  ) {
    const { odoo, ...rest } = dto;
    const values = mergeOdoo(rest as Record<string, unknown>, odoo);
    return this.ticketsService.update(
      req.odooSession,
      parseIdParam(id),
      values,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete ticket' })
  @ApiParam({ name: 'id' })
  async remove(@Param('id') id: string, @Req() req: RequestWithOdooSession) {
    return this.ticketsService.delete(req.odooSession, parseIdParam(id));
  }
}
