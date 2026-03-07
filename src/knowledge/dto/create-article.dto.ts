import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateArticleDto {
  @ApiPropertyOptional({ description: 'Article title' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Article body (HTML)' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({
    description: 'Extra Odoo fields. Merged into create payload.',
  })
  @IsOptional()
  @IsObject()
  odoo?: Record<string, unknown>;
}
