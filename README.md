# AppHub

自托管的移动端应用分发平台（类似 [蒲公英 pgyer](https://www.pgyer.com)），支持 **iOS / Android / 鸿蒙(HarmonyOS)** 构建包上传、版本管理与扫码分发。

## 技术栈

| 端 | 技术 |
| --- | --- |
| 后端 `apps/api` | NestJS 11 · TypeORM · SQLite · JWT · multer |
| 前端 `apps/web` | Vue 3 · Vite · TypeScript · Tailwind CSS v4 · shadcn-vue · Pinia |
| 工程 | pnpm workspaces monorepo |

## 快速开始

```bash
pnpm install

# 开发（api :3000 + web :5173，web 已代理 /api）
pnpm dev

# 生产构建（api 会直接托管 web 的 dist，单端口 3000 提供全部服务）
pnpm build
pnpm start
```

默认管理员账号：`admin` / `admin123`（可用环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 覆盖）。

## 核心功能

- 📦 应用管理：创建应用、图标、描述、平台筛选、搜索
- 🚀 构建分发：上传 `.ipa` / `.apk` / `.hap` / `.app.zip`，版本历史、更新说明、下载量统计
- 📱 扫码安装：公开下载页 `/d/:shareId`（手机优先），二维码扫码直达
  - Android：直接下载 APK 安装
  - iOS：itms-services 安装引导 + 下载
  - 鸿蒙：.hap 下载 + 安装说明
- 🔐 简单认证：JWT 登录，上传/管理需登录，下载页公开

## 目录结构

```
apphub/
├── apps/
│   ├── api/          # NestJS 后端
│   └── web/          # Vue3 前端
├── docs/API.md       # 前后端接口契约
└── PLAN.md           # 项目计划
```

## Docker 部署

```bash
# 构建并启动（数据/上传自动挂卷持久化）
JWT_SECRET=your-secret ADMIN_PASSWORD=strong-password docker compose up -d --build

# 浏览器打开 http://localhost:3000
```

- 单容器同时提供 API + 前端静态资源（main.ts 自动托管 `apps/web/dist`）
- 持久化：`apphub-data`（SQLite）+ `apphub-uploads`（本地模式上传文件）
- S3 存储：设 `STORAGE_DRIVER=s3` 并填 `S3_*` 变量（见 docker-compose.yml 注释）
- ⚠️ 本仓库编写时本机无 Docker，镜像未实机构建验证；如有构建问题请反馈

## 环境变量（api）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 服务端口 |
| `DB_FILE` | `data/apphub.sqlite` | SQLite 数据库文件 |
| `UPLOAD_DIR` | `uploads` | 上传文件目录 |
| `ADMIN_USERNAME` | `admin` | 初始管理员 |
| `ADMIN_PASSWORD` | `admin123` | 初始密码 |
| `JWT_SECRET` | `apphub-dev-secret` | JWT 密钥（生产必改） |
| `STORAGE_DRIVER` | `local` | 存储驱动：`local` \| `s3` |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` | — | S3 存储配置（`STORAGE_DRIVER=s3` 时必填） |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | — | S3 凭据 |
| `S3_PUBLIC_BASE_URL` | — | 可选，S3/CDN 公开访问域名 |
