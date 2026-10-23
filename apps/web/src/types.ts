// 类型定义与 docs/API.md 契约严格对应，请勿擅改

export type Platform = 'ios' | 'android' | 'harmony'

export interface User {
  id: number
  username: string
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
  user: User
}

export interface AppStats {
  total: number
  byPlatform: { android: number; ios: number; harmony: number }
  daily: Array<{ date: string; count: number }> // 最近 30 天（含今天）升序，date 形如 "2026-10-23"
}
