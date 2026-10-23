# AppHub 项目计划

> 下文「MVP / 非目标」保留初版范围。分享密码、下载统计、S3 和 Docker 已在 v2 落地；多用户、注册和角色写在 `docs/API.md` 的 v3 契约中，代码尚未实现。当前能做什么以 `README.md` 的「当前状态」和代码为准。

## 目标

自托管的移动端应用分发平台（类似蒲公英 pgyer），支持 iOS / Android / 鸿蒙(HarmonyOS)。
初版原则：**代码简单简洁、UI 简洁明快好用、手机优先的分发体验**。

## 技术选型

- Monorepo：pnpm workspaces（`apps/api` + `apps/web`）
- 后端：NestJS 11 + TypeORM + SQLite（better-sqlite3）+ JWT + multer 本地存储
- 前端：Vue 3 + Vite + TS + Tailwind CSS v4 + shadcn-vue（shadcn/ui 的 Vue 实现）+ Pinia + vue-router + axios
- 二维码：前端本地生成（qrcode 库），不依赖后端

## MVP 范围

### 功能
1. 登录（默认 admin/admin123，JWT）
2. 应用列表：搜索、平台筛选、卡片展示（图标/名称/最新版本/总下载量）
3. 创建应用、编辑、删除（含文件清理）
4. 上传构建包：平台(ios/android/harmony)、版本号、build号、渠道、更新说明
5. 应用详情：版本历史表格、每版本下载量、二维码、分享链接、删除版本
6. 公开分发页 `/d/:shareId`：手机优先，最新版本突出展示 + 历史版本
   - Android：扫码直接下载 APK
   - iOS：itms-services 安装（https 环境）+ 下载引导
   - 鸿蒙：.hap 下载 + 安装说明
7. 下载计数

### 非目标（v2 再做）
- 多用户/权限、团队、邀请码、密码分享、灰度、安装统计分析、对象存储(S3)、Docker 编排

## 里程碑与分工

| 阶段 | 负责 | 内容 | 状态 |
| --- | --- | --- | --- |
| M0 脚手架 | 本人 | git init、workspace、README、API 契约 | ✅ |
| M1 后端 | Agent B | NestJS 全部 API + 认证 + 上传 + 下载 | ✅ |
| M1 前端 | Agent C | Vue3 全部页面（与后端并行） | ✅ |
| M2 集成 | 本人 + Agent D | pnpm install、构建、API 冒烟 28/28、浏览器端到端验证 | ✅ |
| M3 收尾 | 本人 | 修复 SPA 首页 404 bug、截图、commit | ✅ |
| V2 功能 | Agent B2+C2 | 图标入口、应用编辑、分享密码、下载统计、S3 存储、Docker | ✅ |

## 约定

- 前后端接口契约见 `docs/API.md`（唯一真源，两边都必须遵守）
- 端口：api `3000`，web dev `5173`（vite 代理 `/api` → 3000）
- 生产模式：api 用 ServeStatic 托管 `apps/web/dist`，单端口提供全部服务
- 初版不引入 shared 类型包，前端在 `src/types.ts` 维护轻量类型（避免构建复杂度）
- 风格：简洁明快、留白充足、浅色主题、indigo 主色
