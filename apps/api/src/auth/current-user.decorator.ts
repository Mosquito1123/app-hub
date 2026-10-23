import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { UserRole } from '../entities/user.entity'

/** 登录后挂在 request 上的身份（来自数据库，与 JWT sub 对应） */
export interface AuthUser {
  sub: number
  username: string
  role: UserRole
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user
  },
)
