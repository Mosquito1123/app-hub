import { Build } from './entities/build.entity'
import { App } from './entities/app.entity'

// 时间转 ISO8601 字符串（TypeORM sqlite 读出来可能是 Date 或 string）
function iso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString()
}

export function buildToDto(build: Build) {
  return {
    id: build.id,
    appId: build.appId,
    platform: build.platform,
    version: build.version,
    buildNumber: build.buildNumber ?? null,
    channel: build.channel ?? null,
    releaseNotes: build.releaseNotes ?? null,
    fileName: build.fileName,
    fileExt: build.fileExt,
    fileSize: build.fileSize,
    downloadCount: build.downloadCount,
    createdAt: iso(build.createdAt),
    downloadUrl: `/api/public/builds/${build.id}/download`,
  }
}

// AppItem：builds 需已加载
export function appToItem(app: App) {
  const builds = [...(app.builds ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  return {
    id: app.id,
    name: app.name,
    bundleId: app.bundleId,
    description: app.description ?? null,
    iconUrl: app.iconUrl ?? null,
    shareId: app.shareId,
    createdAt: iso(app.createdAt),
    updatedAt: iso(app.updatedAt),
    buildCount: builds.length,
    downloadCount: builds.reduce((sum, b) => sum + (b.downloadCount ?? 0), 0),
    latestBuild: builds.length > 0 ? buildToDto(builds[0]) : null,
  }
}

export function buildsDesc(app: App) {
  return [...(app.builds ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
