import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { User } from '../entities/user.entity'
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../config'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  // 启动时若 user 表为空，创建默认管理员
  async ensureAdmin() {
    const count = await this.users.count()
    if (count > 0) return
    const salt = randomBytes(16).toString('hex')
    await this.users.save(
      this.users.create({
        username: ADMIN_USERNAME,
        salt,
        passwordHash: this.hash(ADMIN_PASSWORD, salt),
      }),
    )
  }

  private hash(password: string, salt: string): string {
    return scryptSync(password, salt, 64).toString('hex')
  }

  async login(username: string, password: string) {
    if (!username || !password) throw new UnauthorizedException()
    const user = await this.users.findOne({ where: { username } })
    if (!user) throw new UnauthorizedException()
    const hash = Buffer.from(this.hash(password, user.salt), 'hex')
    const stored = Buffer.from(user.passwordHash, 'hex')
    if (hash.length !== stored.length || !timingSafeEqual(hash, stored)) {
      throw new UnauthorizedException()
    }
    const token = await this.jwt.signAsync({ sub: user.id, username: user.username })
    return { token, user: { id: user.id, username: user.username } }
  }

  async me(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()
    return { id: user.id, username: user.username }
  }
}
