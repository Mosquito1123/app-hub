# AppHub API 契约（v1）

> 前后端**唯一真源**。任何一方需要变更，必须先改此文档。

- Base URL：`/api`（开发环境前端通过 vite 代理访问）
- 认证：除标注 `public` 外，均需 Header `Authorization: Bearer <token>`
- 错误：NestJS 标准 HTTP 错误 `{ statusCode, message, error }`；401 表示未登录/令牌失效
- 时间字段：ISO8601 字符串（如 `2026-10-22T10:00:00.000Z`）

## 类型定义

```ts
type Platform = 'ios' | 'android' | 'harmony'

interface User {
  id: number
  username: string
}

interface Build {
  id: number
  appId: number
  platform: Platform
  version: string            // 语义化版本，如 "1.2.0"
  buildNumber: string | null // 如 "128"
  channel: string | null     // 如 "prod" / "xiaomi"
  releaseNotes: string | null
  fileName: string           // 原始文件名，如 "demo.apk"
  fileExt: string            // 小写扩展名，如 "apk"（tar.gz 记为 "tar.gz"）
  fileSize: number           // 字节
  downloadCount: number
  createdAt: string
  downloadUrl: string        // 相对路径：`/api/public/builds/${id}/download`
}

interface AppItem {
  id: number
  name: string
  bundleId: string
  description: string | null
  iconUrl: string | null     // 相对路径：`/uploads/icons/xxx.png`，无图标为 null
  shareId: string            // 6 位短链 ID，如 "a1b2c3"
  createdAt: string
  updatedAt: string
  buildCount: number         // 版本总数
  downloadCount: number      // 所有版本累计下载量
  latestBuild: Build | null  // 最新一次上传的构建
}
```

## 认证

### POST `/api/auth/login` (public)
请求：`{ username: string, password: string }`
响应：`{ token: string, user: User }`
错误：401 凭据错误

### GET `/api/auth/me`
响应：`User`

## 应用管理（需登录）

### GET `/api/apps?q=&platform=`
- `q`：对 name / bundleId 模糊匹配（可选）
- `platform`：按"存在该平台的构建"筛选（可选）
- 响应：`AppItem[]`，按 `updatedAt` 倒序

### POST `/api/apps`
请求：`{ name: string, bundleId: string, description?: string }`
响应：`AppItem`
错误：400 参数缺失；409 同名 bundleId 已存在

### GET `/api/apps/:id`
响应：`AppItem & { builds: Build[] }`（builds 按 createdAt 倒序）

### PATCH `/api/apps/:id`
请求：`{ name?: string, description?: string }`
响应：`AppItem`

### DELETE `/api/apps/:id`
响应：204（级联删除所有构建记录及其磁盘文件）

### POST `/api/apps/:id/icon`
multipart，字段名 `file`（png/jpg/jpeg/svg，≤ 2MB）
响应：`{ iconUrl: string }`（旧图标会被覆盖删除）

## 构建管理（需登录）

### POST `/api/apps/:id/builds`
multipart：
- `file`：构建包，允许扩展名 `.ipa` / `.apk` / `.hap` / `.app` / `.zip` / `.tar.gz`，≤ 500MB
- `platform`：`ios` | `android` | `harmony`（必填）
- `version`：必填
- `buildNumber?` / `channel?` / `releaseNotes?`：可选

响应：`Build`（201）
错误：400 扩展名不支持 / 参数缺失；404 应用不存在

### DELETE `/api/builds/:id`
响应：204（删除记录及磁盘文件）

## 公开接口（无需登录）

### GET `/api/public/apps/:shareId`
响应：`{ app: Omit<AppItem, 'latestBuild' | 'buildCount' | 'downloadCount'>, builds: Build[] }`
- `builds` 按 createdAt 倒序，**包含**应用全部版本
错误：404

### GET `/api/public/builds/:buildId/download` (public)
- 流式返回文件，`Content-Disposition: attachment; filename*=UTF-8''<url编码文件名>`
- 每次调用 `downloadCount + 1`
- iOS 平台的构建同样走此接口下载

### GET `/api/public/builds/:buildId/ios-manifest.plist` (public)
- 返回 iOS itms-services 所需的 `manifest.plist`（`application-identifier` 用 app.bundleId）
- 响应头 `Content-Type: application/xml`

## 静态资源

- 图标：`/uploads/icons/*`（由 api 静态托管）
- 构建包文件**不**静态暴露，只通过 download 接口
- 生产模式：api 托管 `apps/web/dist`（SPA fallback 到 index.html），前端路由 `/d/:shareId` 可直接访问

## 前端路由

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/login` | 登录 | 未登录访问其他页重定向到此 |
| `/` | 应用列表 | 搜索框 + 平台筛选 + 新建应用按钮 |
| `/apps/:id` | 应用详情 | 基本信息 + 上传构建 + 版本历史表格 |
| `/d/:shareId` | 公开分发页 | 手机优先，公开访问，无需登录 |
