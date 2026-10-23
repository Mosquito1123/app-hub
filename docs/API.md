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
  shareProtected: boolean    // v2：是否设置了分享密码（密码值永不出接口）
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

---

# v2 增量契约

## 应用编辑 + 分享密码

### PATCH `/api/apps/:id`（v2 扩展）
请求：`{ name?: string, description?: string, sharePassword?: string }`
- `sharePassword`：非空字符串 = 设置分享密码（明文比对即可，密码值**任何接口都不回传**）；空字符串 `""` = 清除密码
- 响应：`AppItem`

### AppItem 新增 `shareProtected: boolean`（已加入上方类型定义）

## 公开端点密码保护（v2）

三个公开接口都接受可选查询参数 `password`：
- `GET /api/public/apps/:shareId?password=xxx`
- `GET /api/public/builds/:buildId/download?password=xxx`
- `GET /api/public/builds/:buildId/ios-manifest.plist?password=xxx`

规则：
- 应用未设密码：`password` 可省略，行为与 v1 完全一致
- 应用设了密码且 `password` 缺失/错误：返回 **403** `{ statusCode: 403 }`
- 正常：响应与 v1 完全一致
- 前端约定：受保护应用的下载链接、二维码 URL 追加 `?password=`；分享链接本身不含密码（密码另行告知）

## 下载统计（v2）

新增 `DownloadLog` 表（每次下载成功流式响应前插入一行）：
- 字段：id、appId、buildId、platform、createdAt
- 下载接口行为不变，只是多记一行

### GET `/api/apps/:id/stats`（需登录）
响应：
```ts
{
  total: number,                              // 该应用累计下载
  byPlatform: { android: number, ios: number, harmony: number },
  daily: Array<{ date: string, count: number }>  // 最近 30 天（含今天）升序，无下载日 count:0，date 形如 "2026-10-23"
}
```

## 存储驱动（v2，S3 可选）

- 环境变量 `STORAGE_DRIVER`：`local`（默认）| `s3`
- S3 变量：`S3_ENDPOINT`、`S3_REGION`、`S3_BUCKET`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`、`S3_PUBLIC_BASE_URL`（可选，CDN/公开域名）
- 行为：
  - `local`：与 v1 完全一致（磁盘存 `<UPLOAD_DIR>/app-builds|icons/`，下载走流式）
  - `s3`：上传落盘后转存 S3 并删除本地临时文件（图标同理）；下载接口 **302 重定向**到预签名 URL（计数照常 +1）；删除时同步删 S3 对象
- 依赖：`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`（**只在 STORAGE_DRIVER 代码路径用**，local 模式不连网）
- 实现建议：一个 `StorageService`（save(localPath, key) / delete(key) / getDownloadResponse(key)），apps/builds/public 模块都走它

## 图标上传前端入口（v1 接口已存在，v2 补 UI）

`POST /api/apps/:id/icon`（multipart `file`，≤2MB png/jpg/jpeg/svg）→ `{ iconUrl }`

---

# v3 增量契约（账号管理系统，参考 pgyer 模式）

## 模式决策（已确认）
- **开放注册**（带运维开关 `REGISTER_ENABLED`，默认开）
- **两角色**：`admin`（管账号 + 全部应用权限）/ `member`（应用平权，不能管账号）
- **应用全员共享**：应用无归属隔离，仅留痕显示创建者

## 类型新增

```ts
interface UserMe {                // GET /api/auth/me 升级（向后兼容原 User）
  id: number
  username: string
  role: 'admin' | 'member'
}

interface UserAdmin {             // 用户管理列表项
  id: number
  username: string
  role: 'admin' | 'member'
  disabled: boolean
  createdAt: string
}

// AppItem 与 Build 各新增留痕字段（老数据为 null）
createdBy: string | null          // 创建时的用户名快照
```

## 认证（v3 扩展）

### GET `/api/auth/config` (public)
响应：`{ registerEnabled: boolean }`（前端决定是否显示注册入口）

### POST `/api/auth/register` (public)
请求：`{ username: string, password: string }`
- 规则：username 3-20 位（字母/数字/下划线/中文）；password 6-20 位
- 新用户 `role: 'member'`
响应：`{ token: string, user: UserMe }`（注册即登录）
错误：400 参数不合法；409 用户名已存在；**403 注册开关已关闭**

### POST `/api/auth/login`（响应升级）
响应：`{ token, user: UserMe }`（多带 `role`，前端路由按角色控制入口）
错误：401 凭据错误；**403 账号已被禁用**

### POST `/api/auth/change-password`（需登录，两角色均可）
请求：`{ oldPassword: string, newPassword: string }`
响应：204
错误：401 未登录；400 旧密码错误/新密码不合法

## 用户管理（v3，仅 admin；403 给非 admin）

### GET `/api/users`
响应：`UserAdmin[]`（按 createdAt 升序，含当前用户自己）

### POST `/api/users`（admin 直接添加）
请求：`{ username, password, role?: 'admin' | 'member' }`（role 默认 member）
响应：`UserAdmin`（201）；错误：400/409

### PATCH `/api/users/:id`
请求：`{ role?: 'admin' | 'member', disabled?: boolean, newPassword?: string }`（至少一个）
响应：`UserAdmin`
保护规则：**不能修改自己的 role 和 disabled**（400）；`newPassword` 为管理员重置密码
错误：404 用户不存在

### DELETE `/api/users/:id`
响应：204
保护规则：**不能删除自己**（400）

## 守卫
- `@Roles('admin')` 装饰器 + RolesGuard：`/api/users*` 全部要求 admin
- 其余登录接口两角色均可

## 下载页补充（参考 pgyer 展示项，前端本地补充即可，无新接口）
- 展示文件大小（Build.fileSize 已有，格式化 MB）
- "或者用手机扫描二维码安装"引导文案（桌面）
- 底部风险提示小字（参考 pgyer 免责声明，一句话即可）

## 前端路由（v3 新增）

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/login` | 登录/注册 | 参考 pgyer 左右分栏：左品牌区右表单，底部"还没有账号？去注册"切换 |
| `/users` | 用户管理 | **仅 admin 可见/可访**，member 访问显示 403 无权限提示 |

