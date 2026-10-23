import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User, UserRole } from '../entities/user.entity'
import { ADMIN_PASSWORD, ADMIN_USERNAME, REGISTER_ENABLED } from '../config'
import {
  PASSWORD_RE,
  USERNAME_RE,
  hashPassword,
  isSqliteUnique,
  passwordSalt,
  verifyPassword,
} from './password.util'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  // 启动时若 user 表为空，创建默认管理员。
  // 从 v2 升级时新列默认是 member：若库里还没有任何 admin，把 ADMIN_USERNAME 提升为 admin（避免锁死）。
  async ensureAdmin() {
    await this.users
      .createQueryBuilder()
      .update(User)
      .set({ role: 'member' })
      .where("role IS NULL OR role = ''")
      .execute()
    await this.users
      .createQueryBuilder()
      .update(User)
      .set({ disabled: false })
      .where('disabled IS NULL')
      .execute()

    const count = await this.users.count()
    if (count === 0) {
      await this.insertUser(ADMIN_USERNAME, ADMIN_PASSWORD, 'admin')
      return
    }
    const adminCount = await this.users.count({ where: { role: 'admin' } })
    if (adminCount > 0) return
    const seed = await this.users.findOne({ where: { username: ADMIN_USERNAME } })
    if (seed) {
      seed.role = 'admin'
      seed.disabled = false
      await this.users.save(seed)
      return
    }
    await this.insertUser(ADMIN_USERNAME, ADMIN_PASSWORD, 'admin')
  }

  async login(username: string, password: string) {
    if (!username || !password) throw new UnauthorizedException()
    const user = await this.users.findOne({ where: { username } })
    if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
      throw new UnauthorizedException()
    }
    if (user.disabled) throw new ForbiddenException('账号已被禁用')
    return this.issue(user)
  }

  async me(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()
    if (user.disabled) throw new UnauthorizedException('账号已被禁用')
    return this.toMe(user)
  }

  // v3：开放注册（开关关闭时 403，新用户默认 member），注册即登录
  async register(username: unknown, password: unknown) {
    if (!REGISTER_ENABLED) throw new ForbiddenException('注册已关闭')
    const name = typeof username === 'string' ? username.trim() : ''
    if (!USERNAME_RE.test(name)) {
      throw new BadRequestException('用户名需为 3-20 位（字母/数字/下划线/中文）')
    }
    if (typeof password !== 'string' || !PASSWORD_RE.test(password)) {
      throw new BadRequestException('密码需为 6-20 位')
    }
    const exist = await this.users.findOne({ where: { username: name } })
    if (exist) throw new ConflictException('用户名已存在')
    try {
      const user = await this.insertUser(name, password, 'member')
      return this.issue(user)
    } catch (e) {
      if (isSqliteUnique(e)) throw new ConflictException('用户名已存在')
      throw e
    }
  }

  // v3：登录用户修改自己的密码
  async changePassword(userId: number, oldPassword: unknown, newPassword: unknown) {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()
    if (typeof oldPassword !== 'string' || !verifyPassword(oldPassword, user.salt, user.passwordHash)) {
      throw new BadRequestException('原密码不正确')
    }
    if (typeof newPassword !== 'string' || !PASSWORD_RE.test(newPassword)) {
      throw new BadRequestException('新密码需为 6-20 位')
    }
    user.salt = passwordSalt()
    user.passwordHash = hashPassword(newPassword, user.salt)
    await this.users.save(user)
  }

  private async insertUser(username: string, password: string, role: UserRole): Promise<User> {
    const salt = passwordSalt()
    return this.users.save(
      this.users.create({
        username,
        salt,
        passwordHash: hashPassword(password, salt),
        role,
        disabled: false,
      }),
    )
  }

  private async issue(user: User) {
    const token = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    })
    return { token, user: this.toMe(user) }
  }

  private toMe(user: User) {
    return {
      id: user.id,
      username: user.username,
      role: user.role === 'admin' ? ('admin' as const) : ('member' as const),
    }
  }
}
