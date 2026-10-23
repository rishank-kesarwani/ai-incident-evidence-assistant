import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, IsPublic } from '../../common/decorators';
import { AuthService, LoginDto } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @IsPublic()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in operator and issue JWT session token' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @IsPublic()
  @Get('status')
  @ApiOperation({ summary: 'Get current authentication and feature flag status' })
  getStatus() {
    return this.authService.getStatus();
  }

  @Get('me')
  @ApiOperation({ summary: 'Retrieve currently authenticated operator profile' })
  getProfile(@CurrentUser() user: any) {
    return { user };
  }
}
