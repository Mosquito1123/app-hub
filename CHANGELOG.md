# 更新日志

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。
`package.json` 当前版本是 `0.1.0`。下面的 v0.1 / v2 / v3 是功能阶段，仓库里没有对应的 Git 标签。

## [Unreleased]

### Added

- v3 账号系统：开放注册由 `REGISTER_ENABLED` 控制（默认开启；`0` / `false` / `off` / `no` 关闭）。关闭时 `GET /api/auth/config` 返回 `registerEnabled: false`，`POST /api/auth/register` 返回 403，登录页隐藏注册入口。角色为 `admin` / `member`，JWT 携带 `role`，鉴权以数据库中的当前角色为准。`/api/users` 仅 admin（列表、添加、改角色、禁用、重置密码、删除；不能改自己的角色和禁用状态，不能删除自己）。登录用户可修改自己的密码；禁用账号登录返回 403，已签发的令牌随后失效。应用与构建增加 `createdBy` 用户名快照，应用仍全员共享。前端为左右分栏登录/注册，以及 `/users` 管理页。
- 仓库说明：补充 MIT `LICENSE`、新人可照做的 `README`、本更新日志、`.env.example` 与 `CONTRIBUTING.md`。仓库原先没有声明许可证，因此采用 MIT。

## [0.1.0] - 2026-10-23

`0.1.0` 覆盖 2026-10-22 的首版与 2026-10-23 合入主干的 Docker、v2，版本号没有随 v2 递增。

### Added

- 脚手架（2026-10-22）：pnpm workspace monorepo、`PLAN.md`、`docs/API.md` 的 v1 契约。
- v0.1（2026-10-22）：自托管分发闭环。NestJS API 与 Vue 3 Web；应用创建、编辑入口、搜索与平台筛选；上传 `.ipa` / `.apk` / `.hap` / `.app` / `.zip` / `.tar.gz`；版本历史、更新说明与下载计数；公开页 `/d/:shareId` 与二维码；JWT 登录（用户表为空时写入默认管理员）；SQLite 与本地文件存储。
- Docker（2026-10-23）：多阶段 `Dockerfile` 与 `docker-compose.yml`，SQLite 和上传目录使用卷持久化。
- v2（2026-10-23）：应用资料编辑、图标上传、分享密码、下载统计（累计、分平台、近 30 天）、可选 S3 存储驱动。

### Fixed

- 下载统计的 `total` 与 `byPlatform` 改为读取构建上的下载计数，从而包含 v2 统计表出现之前的下载（2026-10-23）。
