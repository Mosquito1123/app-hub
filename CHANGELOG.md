# Changelog

## Unreleased

### v3 账号系统

- 开放注册，由 `REGISTER_ENABLED` 控制（默认开启）。关闭时 `GET /api/auth/config` 返回 `registerEnabled: false`，`POST /api/auth/register` 返回 403，登录页隐藏注册入口。
- 角色 `admin` / `member`。JWT 携带 `role`；鉴权以数据库中的当前角色为准。`/api/users` 仅 admin，其他登录接口两角色均可。
- 用户管理：列表（按创建时间升序）、添加、修改角色 / 禁用 / 重置密码、删除。不能修改自己的角色和禁用状态，不能删除自己。
- 登录用户可修改自己的密码。禁用账号登录返回 403，已签发的令牌随后请求失效。
- 应用与构建增加 `createdBy` 用户名快照。应用仍全员共享，不做归属隔离。
- 登录/注册改为左右分栏；新增 `/users` 管理页（member 访问显示 403）。
- 下载页展示文件大小、桌面端扫码安装引导，以及一句风险提示。
