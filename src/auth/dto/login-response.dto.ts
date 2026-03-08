import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({ example: 'joao@example.com' })
  email: string;

  @ApiProperty({ example: 'Desenvolvedor', nullable: true, description: 'Cargo do usuário (hr.employee job_id/job_title)' })
  role: string | null;

  @ApiProperty({ example: 'TI', nullable: true })
  department: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class LoginResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty({ description: 'Token validity in seconds' })
  expires_in: number;

  @ApiProperty({ type: LoginUserDto })
  user: LoginUserDto;
}
