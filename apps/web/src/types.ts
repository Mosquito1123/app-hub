// 类型定义与 docs/API.md 契约严格对应，请勿擅改

export type Platform = 'ios' | 'android' | 'harmony'

export type Role = 'admin' | 'member'

export interface User {
  id: number
  username: string
}

/** GET /api/auth/me 与登录/注册响应（v3） */
export interface UserMe extends User {
  role: Role
}

/** 用户管理列表项（v3，仅 admin） */
export interface UserAdmin {
  id: number
  username: string
  role: Role
  disabled: boolean
  createdAt: string
}

/** GET /api/auth/config（public） */
export interface AuthConfig {
  registerEnabled: boolean
}

export interface Build {
  id: number
  appId: number
  platform: Platform
  version: string
  buildNumber: string | null
  channel: string | null
  releaseNotes: string | null
  fileName: string
  fileExt: string
  fileSize: number
  downloadCount: number
  createdBy: string | null // v3：上传者用户名快照，老数据为 null
  createdAt: string
  downloadUrl: string // 相对路径：/api/public/builds/${id}/download
}

export interface AppItem {
  id: number
  name: string
  bundleId: string
  description: string | null
  iconUrl: string | null // 相对路径：/uploads/icons/xxx.png
  shareId: string
  shareProtected: boolean // v2：是否设置了分享密码（密码值永不出接口）
  createdBy: string | null // v3：创建者用户名快照，老数据为 null
  createdAt: string
  updatedAt: string
  buildCount: number
  downloadCount: number
  latestBuild: Build | null
}

export interface AppDetail extends AppItem {
  builds: Build[] // 按 createdAt 倒序
}

export interface PublicApp {
  app: Omit<AppItem, 'latestBuild' | 'buildCount' | 'downloadCount'>
  builds: Build[] // 按 createdAt 倒序，包含全部版本
}

export interface LoginResponse {
  token: string
  user: UserMe
}

export interface AppStats {
  total: number
  byPlatform: { android: number; ios: number; harmony: number }
  daily: Array<{ date: string; count: number }> // 最近 30 天（含今天）升序，date 形如 "2026-10-23"
}
