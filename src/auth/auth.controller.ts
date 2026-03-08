import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login-response.dto';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OdooSessionGuard } from './guards/odoo-session.guard';
import type { RequestWithOdooSession } from './guards/odoo-session.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Login with Odoo credentials' })
  @ApiResponse({
    status: 201,
    description: 'Returns access_token, expires_in and user data',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid Odoo credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @UseGuards(OdooSessionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate session' })
  @ApiResponse({ status: 200, description: 'Session invalidated' })
  @ApiResponse({ status: 401, description: 'Invalid or missing token' })
  async logout(@Req() req: RequestWithOdooSession) {
    const token = req.headers.authorization?.slice(7) ?? '';
    return this.authService.logout(token);
  }
}
