import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User, UserRole } from '../entities/user.entity'
import { userToAdminDto } from '../serialize'
import {
  PASSWORD_RE,
  USERNAME_RE,
  hashPassword,
  isSqliteUnique,
  passwordSalt,
} from '../auth/password.util'

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async list() {
    const rows = await this.users.find({ order: { createdAt: 'ASC', id: 'ASC' } })
    return rows.map(userToAdminDto)
  }

  async create(body: { username?: unknown; password?: unknown; role?: unknown }) {
    const username = typeof body?.username === 'string' ? body.username.trim() : ''
    const password = body?.password
    if (!USERNAME_RE.test(username)) {
      throw new BadRequestException('用户名需为 3-20 位（字母/数字/下划线/中文）')
    }
    if (typeof password !== 'string' || !PASSWORD_RE.test(password)) {
      throw new BadRequestException('密码需为 6-20 位')
    }
    const role = this.parseRole(body?.role, true)
    const exist = await this.users.findOne({ where: { username } })
    if (exist) throw new ConflictException('用户名已存在')
    const salt = passwordSalt()
    try {
      const user = await this.users.save(
        this.users.create({
          username,
          salt,
          passwordHash: hashPassword(password, salt),
          role,
          disabled: false,
        }),
      )
      return userToAdminDto(user)
    } catch (e) {
      if (isSqliteUnique(e)) throw new ConflictException('用户名已存在')
      throw e
    }
  }

  async update(
    id: number,
    actorId: number,
    payload: { role?: unknown; disabled?: unknown; newPassword?: unknown },
  ) {
    const user = await this.users.findOne({ where: { id } })
    if (!user) throw new NotFoundException('用户不存在')

    const hasRole = payload?.role !== undefined
    const hasDisabled = payload?.disabled !== undefined
    const hasPassword = payload?.newPassword !== undefined
    if (!hasRole && !hasDisabled && !hasPassword) {
      throw new BadRequestException('至少提供 role、disabled 或 newPassword 之一')
    }
    if (id === actorId && (hasRole || hasDisabled)) {
      throw new BadRequestException('不能修改自己的 role 和 disabled')
    }
    if (hasRole) {
      user.role = this.parseRole(payload.role, false)
    }
    if (hasDisabled) {
      if (typeof payload.disabled !== 'boolean') {
        throw new BadRequestException('disabled 需为布尔值')
      }
      user.disabled = payload.disabled
    }
    if (hasPassword) {
      const next = payload.newPassword
      if (typeof next !== 'string' || !PASSWORD_RE.test(next)) {
        throw new BadRequestException('新密码需为 6-20 位')
      }
      user.salt = passwordSalt()
      user.passwordHash = hashPassword(next, user.salt)
    }
    await this.users.save(user)
    return userToAdminDto(user)
  }

  async remove(id: number, actorId: number) {
    if (id === actorId) throw new BadRequestException('不能删除自己')
    const user = await this.users.findOne({ where: { id } })
    if (!user) throw new NotFoundException('用户不存在')
    await this.users.remove(user)
  }

  /** fallback=true：省略 role 时默认 member；false：role 必填且必须合法 */
  private parseRole(role: unknown, fallback: boolean): UserRole {
    if (role === undefined && fallback) return 'member'
    if (role === 'admin' || role === 'member') return role
    throw new BadRequestException('role 不合法')
  }
}
