import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'

export type UserRole = 'admin' | 'member'

@Entity('users')
@Unique(['username'])
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  username: string

  @Column()
  passwordHash: string

  @Column()
  salt: string

  // v3：admin 管账号；member 应用平权，不能管账号
  @Column({ type: 'varchar', default: 'member' })
  role: UserRole

  // v3：禁用后无法登录，已签发的令牌也会在守卫里失效
  @Column({ type: 'boolean', default: false })
  disabled: boolean

  @CreateDateColumn()
  createdAt: Date
}
