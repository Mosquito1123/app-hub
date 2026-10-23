# 参与贡献

## 本地运行

需要 Node.js 20 或更高版本，以及 pnpm 9（`package.json` 的 `packageManager` 为 `pnpm@9.15.9`）。

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install
pnpm dev
```

- Web：<http://localhost:5173>（把 `/api` 和 `/uploads` 代理到 API）
- API：<http://localhost:3000/api>

用户表为空时会创建管理员，默认 `admin` / `admin123`。生产环境请改 `ADMIN_PASSWORD` 和 `JWT_SECRET`，见 `.env.example`。API 不会自动读取 `.env` 文件。

不要提交 `.env`、`data/`、`uploads/` 或任何真实密钥。

## 分支与 Pull Request

1. 从 `main` 拉出功能分支。
2. 改动接口时，先改 `docs/API.md`，再改前后端。该文件是接口契约。
3. 提交说明写清做了什么。Pull Request 说明动机、主要改动，以及如何验证。
4. `PLAN.md` 里的早期「非目标」可能滞后于代码。新增范围时以当前代码和 `docs/API.md` 为准，并在 PR 里写明，不要只改计划文档。
