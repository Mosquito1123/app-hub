import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { CurrentUser, type AuthUser } from './current-user.decorator'
import { REGISTER_ENABLED } from '../config'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // v3：注册开关（public）
  @Get('config')
  config() {
    return { registerEnabled: REGISTER_ENABLED }
  }

  @Post('register')
  register(@Body() body: { username?: unknown; password?: unknown }) {
    return this.authService.register(body?.username, body?.password)
  }

  @Post('login')
  login(@Body() body: { username?: string; password?: string }) {
    return this.authService.login(body?.username ?? '', body?.password ?? '')
  }

  @Post('change-password')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: { oldPassword?: unknown; newPassword?: unknown },
  ) {
    return this.authService.changePassword(user.sub, body?.oldPassword, body?.newPassword)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.sub)
  }
}
