/** 与 docs/API.md v3 一致：用户名 3-20 位（字母/数字/下划线/中文），密码 6-20 位 */
export const USERNAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/

export function passwordOk(password: string): boolean {
  return password.length >= 6 && password.length <= 20
}

export function errorMessage(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  if (Array.isArray(msg)) return msg.map(String).join('，')
  if (typeof msg === 'string' && msg.trim()) return msg
  return fallback
}
