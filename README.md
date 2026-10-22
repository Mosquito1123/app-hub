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

## 环境变量（api）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 服务端口 |
| `DB_FILE` | `data/apphub.sqlite` | SQLite 数据库文件 |
| `UPLOAD_DIR` | `uploads` | 上传文件目录 |
| `ADMIN_USERNAME` | `admin` | 初始管理员 |
| `ADMIN_PASSWORD` | `admin123` | 初始密码 |
| `JWT_SECRET` | `apphub-dev-secret` | JWT 密钥（生产必改） |
