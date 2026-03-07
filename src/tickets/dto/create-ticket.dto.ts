import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketDto {
  @ApiProperty({ description: 'Helpdesk team ID (required)' })
  @IsNumber()
  @Type(() => Number)
  teamId: number;

  @ApiPropertyOptional({ description: 'Ticket name/title' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Ticket description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Extra Odoo fields (e.g. priority, tag_ids, partner_id). Merged into create payload.',
  })
  @IsOptional()
  @IsObject()
  odoo?: Record<string, unknown>;
}
