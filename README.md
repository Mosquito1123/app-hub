# AppHub

自托管的移动应用分发平台（类似 [蒲公英 pgyer](https://www.pgyer.com)）：上传 iOS / Android / 鸿蒙安装包，管理版本，并用公开页和二维码把包发给安装的人。

仓库原先的 README 和 `PLAN.md` 都没有指定许可证，现采用 **[MIT](LICENSE)**。

## 功能

- 应用：创建、编辑名称与描述、上传图标、按名称或 Bundle ID 搜索、按平台筛选
- 构建：上传 `.ipa` / `.apk` / `.hap` / `.app` / `.zip` / `.tar.gz`（单文件最大 500MB），记录版本号、构建号、渠道和更新说明，可删除历史版本
- 公开下载：`/d/:shareId`，手机优先，页面上的二维码指向该链接
  - Android：直接下载 APK
  - iOS：itms-services 安装引导（需要 HTTPS）以及文件下载
  - 鸿蒙：下载 `.hap`，页面附安装说明
- 分享密码：可为应用设置密码。分享链接本身不带密码；受保护时，下载和二维码地址会附带 `?password=`
- 统计：应用累计下载、分平台下载、近 30 天每日下载
- 图标：png / jpg / jpeg / svg，最大 2MB
- 存储：默认本地磁盘；可切换到 S3 兼容对象存储
- 部署：pnpm 脚本，或单容器 Docker Compose（API 同时托管前端构建产物）
- 账号：JWT 登录，开放注册（可用 `REGISTER_ENABLED` 关闭）。`admin` 管理用户，`member` 与管理员一样管理应用。应用全员共享，只记录创建者用户名。上传和管理需要登录，下载页公开。令牌有效期 7 天

## 技术栈

pnpm workspace monorepo（Node.js ≥ 20，`packageManager` 为 `pnpm@9.15.9`）。

| 端 | 技术 |
| --- | --- |
| 后端 `apps/api` | NestJS 11 · TypeORM · SQLite（better-sqlite3）· JWT · multer · 可选 AWS SDK v3 |
| 前端 `apps/web` | Vue 3 · Vite · TypeScript · Tailwind CSS v4 · Pinia · Vue Router · axios · qrcode |
| 界面 | `apps/web/src/components/ui` 里的 shadcn-vue 风格组件，基于 reka-ui |

## 当前状态

以代码为准。`PLAN.md` 里程碑表里 v2 与 v3 均已完成；文首「非目标（v2 再做）」仍是初版范围，其中分享密码、下载统计、S3、Docker 以及多用户账号已经实现。阅读进度时以本节为准。

| 阶段 | 状态 |
| --- | --- |
| v0.1 分发闭环 | 已实现：应用、构建上传、公开二维码页、JWT 登录、SQLite、本地存储 |
| v2 | 已实现：图标与应用编辑、分享密码、下载统计、S3、Docker |
| v3 账号系统 | 已实现：开放注册（`REGISTER_ENABLED`，默认开）、`admin` / `member`、`/users` 用户管理、修改密码、禁用账号、`createdBy` 留痕。应用全员共享 |

接口以 [`docs/API.md`](docs/API.md) 为唯一契约。项目范围的历史记录见 [`PLAN.md`](PLAN.md)，变更记录见 [`CHANGELOG.md`](CHANGELOG.md)。

## 快速开始

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate

pnpm install

# 开发：API http://localhost:3000/api ，Web http://localhost:5173
# Vite 把 /api 和 /uploads 代理到 3000
pnpm dev

# 生产：先构建，再由 API 托管 apps/web/dist，浏览器打开 http://localhost:3000
pnpm build
pnpm start
```

用户表为空时，API 启动会写入一名管理员，默认 `admin` / `admin123`。可用 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 覆盖**这一次**创建。库里已经有用户之后，再改这两个变量不会改密码。

开放注册默认开启，新用户角色为 `member`。设 `REGISTER_ENABLED=0`（或 `false` / `off` / `no`）关闭注册入口和 `POST /api/auth/register`。`admin` 在「用户」页管理账号。

API 进程（`pnpm dev` 中的 api，以及 `pnpm start`）的工作目录是 `apps/api`，所以默认数据库是 `apps/api/data/apphub.sqlite`，上传目录是 `apps/api/uploads`。

## Docker Compose

```bash
cp .env.example .env
# 编辑 .env：至少改掉 ADMIN_PASSWORD 和 JWT_SECRET

docker compose up -d --build
```

浏览器打开 <http://localhost:3000>。

- 一个容器同时提供 API 和前端静态文件（`apps/api/src/main.ts` 在存在 `apps/web/dist/index.html` 时托管它）
- 卷：`apphub-data` → 容器内 `apps/api/data`（SQLite），`apphub-uploads` → `apps/api/uploads`
- Compose 会把根目录 `.env` 用于变量替换。进入容器的只有 `docker-compose.yml` 里写明的项：`JWT_SECRET`、`ADMIN_USERNAME`、`ADMIN_PASSWORD`、`REGISTER_ENABLED`、`STORAGE_DRIVER`，以及取消注释后的 `S3_*`
- Compose 默认把 `JWT_SECRET` 设为 `change-me-in-production`（与代码里的开发默认值不同）。生产环境请换成足够长的随机字符串
- 镜像定义在 `Dockerfile`。合入 Docker 时作者环境没有实际构建过该镜像；在目标机器上首次部署请先完成一次 `docker compose build`

S3：在 `.env` 中设置 `STORAGE_DRIVER=s3`，并在 `docker-compose.yml` 里取消 `S3_*` 的注释。`local` 模式不会连接对象存储。

## 环境变量

定义见 `apps/api/src/config.ts` 与 `apps/api/src/storage/storage.service.ts`。示例文件是 [`.env.example`](.env.example)。

本地进程**不会**自动加载 `.env`。需要在启动前导出，例如 `set -a && source .env && set +a && pnpm dev`。

**生产环境必须修改 `ADMIN_PASSWORD` 和 `JWT_SECRET`。** 不要使用表中的默认值。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | HTTP 端口 |
| `DB_FILE` | `data/apphub.sqlite` | SQLite 路径，相对进程工作目录（`apps/api`） |
| `UPLOAD_DIR` | `uploads` | 本地上传根目录，其下为 `app-builds/` 与 `icons/` |
| `ADMIN_USERNAME` | `admin` | 仅当用户表为空时写入的管理员用户名 |
| `ADMIN_PASSWORD` | `admin123` | 仅当用户表为空时写入的密码。生产必须修改。已有用户后改此变量不会更新密码 |
| `JWT_SECRET` | `apphub-dev-secret` | JWT 签名密钥。生产必须修改 |
| `REGISTER_ENABLED` | 开启 | 开放注册。未设置，或除 `0` / `false` / `off` / `no` 以外的值，均为开启。关闭后登录页不显示注册入口，`POST /api/auth/register` 返回 403。`config.ts` 会读取该变量 |
| `STORAGE_DRIVER` | `local` | `local` 或 `s3`。只有值为 `s3` 时才读取下面的 `S3_*` 并连接存储 |
| `S3_ENDPOINT` | 空 | S3 兼容端点。非空时客户端使用 path-style |
| `S3_REGION` | `auto` | 区域，仅 s3 模式 |
| `S3_BUCKET` | 空 | 桶名。s3 模式必填 |
| `S3_ACCESS_KEY` | 空 | 访问密钥。s3 模式必填 |
| `S3_SECRET_KEY` | 空 | 秘密密钥。s3 模式必填 |
| `S3_PUBLIC_BASE_URL` | 空 | 可选。设置后图标 URL 使用 `<该地址>/icons/<文件>`，并删除本地临时图标；不设置时图标仍走本地 `/uploads/icons/`。构建包下载始终使用预签名 URL（约 1 小时），不使用这个地址 |

## 目录

```
apphub/
├── apps/api/          # NestJS
├── apps/web/          # Vue 3
├── docs/API.md        # 接口契约
├── docs/screenshots/  # 界面截图
├── Dockerfile
├── docker-compose.yml
├── PLAN.md            # 早期计划，部分「非目标」已过时
├── CHANGELOG.md
├── CONTRIBUTING.md
└── .env.example
```

## 界面

开发时抓取的截图，路径相对仓库根目录：

- [应用列表](docs/screenshots/01-apps-desktop.png)
- [应用详情](docs/screenshots/02-app-detail-desktop.png)
- [v2 详情（图标、分享密码、统计）](docs/screenshots/04-detail-v2.png)
- [公开下载页（手机）](docs/screenshots/03-download-mobile.png)

## 相关文档

- [docs/API.md](docs/API.md) — 前后端接口契约
- [PLAN.md](PLAN.md) — 项目计划（文首「非目标」是初版范围，进度以上文「当前状态」为准）
- [CHANGELOG.md](CHANGELOG.md) — 更新日志
- [CONTRIBUTING.md](CONTRIBUTING.md) — 如何在本地运行并提交改动
- [LICENSE](LICENSE) — MIT
