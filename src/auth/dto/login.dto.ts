import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Odoo username or email' })
  @IsString()
  @IsNotEmpty({ message: 'username is required' })
  @MaxLength(255)
  username: string;

  @ApiPropertyOptional({ description: 'Odoo password (or use apiKey)' })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  password?: string;

  @ApiPropertyOptional({
    description: 'Odoo API key (alternative to password)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  apiKey?: string;
}
