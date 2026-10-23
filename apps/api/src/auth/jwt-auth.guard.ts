import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Request } from 'express'
import { User } from '../entities/user.entity'
import type { AuthUser } from './current-user.decorator'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>()
    const auth = req.headers.authorization
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined
    if (!token) throw new UnauthorizedException()
    let payload: { sub?: number }
    try {
      payload = await this.jwt.verifyAsync(token)
    } catch {
      throw new UnauthorizedException()
    }
    const userId = Number(payload?.sub)
    if (!Number.isInteger(userId) || userId <= 0) throw new UnauthorizedException()
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()
    // 禁用立即生效（登录接口本身返回 403；已签发的令牌在这里作废）
    if (user.disabled) throw new UnauthorizedException('账号已被禁用')
    const authUser: AuthUser = { sub: user.id, username: user.username, role: user.role }
    ;(req as Request & { user: AuthUser }).user = authUser
    return true
  }
}
