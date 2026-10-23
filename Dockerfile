# AppHub 生产镜像：构建阶段编译 api + web，运行阶段只带产物
# 构建：docker build -t apphub .
# 运行：docker compose up -d

# ---------- 构建阶段 ----------
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY apps/web apps/web
RUN pnpm --filter @apphub/api build && pnpm --filter @apphub/web build

# ---------- 运行阶段 ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

# workspace 文件（pnpm 安装需要）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/

# 只装 api 生产依赖；better-sqlite3 无 musl 预编译时临时用编译工具链，装完即删
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && pnpm install --frozen-lockfile --filter @apphub/api --prod \
  && apk del .build-deps

# 产物：api dist + web dist（main.ts 按 ../../web/dist 相对定位，布局必须一致）
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/web/dist apps/web/dist

# CWD = /app/apps/api：数据默认落 data/、上传落 uploads/（compose 挂卷）
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
