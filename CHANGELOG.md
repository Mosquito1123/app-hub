# 更新日志

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。
`package.json` 当前版本是 `0.1.0`。下面的 v0.1 / v2 / v3 是功能阶段，仓库里没有对应的 Git 标签。

## [Unreleased]

### Added

- 文档：v3 账号系统接口契约（`docs/API.md`）。开放注册与运维开关 `REGISTER_ENABLED`（契约默认开启）、`admin` / `member` 两种角色、应用全员共享、创建者留痕。仅有契约：注册、改密、用户管理接口和 `/users` 页面都还没有实现，运行中的 API 也不读取 `REGISTER_ENABLED`。
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
