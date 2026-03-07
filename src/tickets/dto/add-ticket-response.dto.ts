import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class AddTicketResponseDto {
  @ApiProperty({ description: 'Message body (response content)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    description: 'Message type: comment, notification, or email',
    default: 'comment',
  })
  @IsOptional()
  @IsString()
  message_type?: string;

  @ApiPropertyOptional({ description: 'Message subject (mainly for emails)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description:
      'Extra message_post kwargs (e.g. partner_ids, attachment_ids). Merged into message_post.',
  })
  @IsOptional()
  @IsObject()
  odoo?: Record<string, unknown>;
}
