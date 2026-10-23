import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

/** 用户名 3-20 位：字母、数字、下划线、中文 */
export const USERNAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/

/** 密码 6-20 位（任意字符） */
export const PASSWORD_RE = /^.{6,20}$/

export function passwordSalt(): string {
  return randomBytes(16).toString('hex')
}

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex')
}

export function verifyPassword(password: string, salt: string, passwordHash: string): boolean {
  const hash = Buffer.from(hashPassword(password, salt), 'hex')
  const stored = Buffer.from(passwordHash, 'hex')
  if (hash.length !== stored.length) return false
  return timingSafeEqual(hash, stored)
}

export function isSqliteUnique(e: unknown): boolean {
  const err = e as { code?: string; message?: string; driverError?: { code?: string; message?: string } }
  const code = err?.driverError?.code ?? err?.code ?? ''
  const message = `${err?.message ?? ''} ${err?.driverError?.message ?? ''}`
  return (
    code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    (code === 'SQLITE_CONSTRAINT' && /unique/i.test(message)) ||
    /UNIQUE constraint failed/i.test(message)
  )
}
