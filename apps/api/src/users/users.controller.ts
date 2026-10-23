import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles, RolesGuard } from '../auth/roles.guard'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.list()
  }

  @Post()
  @HttpCode(201)
  create(@Body() body: { username?: unknown; password?: unknown; role?: unknown }) {
    return this.usersService.create(body ?? {})
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() body: { role?: unknown; disabled?: unknown; newPassword?: unknown },
  ) {
    return this.usersService.update(id, user.sub, body ?? {})
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.usersService.remove(id, user.sub)
  }
}
