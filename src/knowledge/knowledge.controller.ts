import {
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
import { KnowledgeService } from './knowledge.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('Knowledge (Base de Conhecimento)')
@ApiBearerAuth()
@Controller('knowledge/articles')
@UseGuards(OdooSessionGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  @ApiOperation({ summary: 'List knowledge articles' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'fields', required: false })
  @ApiQuery({
    name: 'root_article_id',
    required: false,
    description: 'Filter by root article ID',
  })
  @ApiQuery({
    name: 'odoo',
    required: false,
    description: 'JSON object with extra search_read kwargs',
  })
  async findAll(
    @Query() query: Record<string, string>,
    @Req() req: RequestWithOdooSession,
  ) {
    const domain: unknown[] = [];
    const rootArticleId = query.root_article_id?.trim();
    if (rootArticleId) {
      const id = parseInt(rootArticleId, 10);
      if (!Number.isNaN(id)) {
        domain.push(['root_article_id', '=', id]);
      }
    }
    const limit = parseLimit(query.limit);
    const offset = parseOffset(query.offset);
    const fields = query.fields ? query.fields.split(',') : undefined;
    const odoo = parseOdooQuery(query.odoo);
    return this.knowledgeService.search(req.odooSession, {
      domain: domain.length ? domain : undefined,
      limit,
      offset,
      fields,
      odoo,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get article by ID' })
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
    return this.knowledgeService.read(
      req.odooSession,
      parseIdParam(id),
      undefined,
      odoo,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create article' })
  async create(
    @Body() dto: CreateArticleDto,
    @Req() req: RequestWithOdooSession,
  ) {
    const { odoo, ...rest } = dto;
    const values = mergeOdoo(rest as Record<string, unknown>, odoo);
    return this.knowledgeService.create(req.odooSession, values);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update article' })
  @ApiParam({ name: 'id' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @Req() req: RequestWithOdooSession,
  ) {
    const { odoo, ...rest } = dto;
    const values = mergeOdoo(rest as Record<string, unknown>, odoo);
    return this.knowledgeService.update(
      req.odooSession,
      parseIdParam(id),
      values,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete article' })
  @ApiParam({ name: 'id' })
  async remove(@Param('id') id: string, @Req() req: RequestWithOdooSession) {
    return this.knowledgeService.delete(req.odooSession, parseIdParam(id));
  }
}
