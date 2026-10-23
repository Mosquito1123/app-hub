import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { randomBytes } from 'crypto'
import { App } from '../entities/app.entity'
import { Build, PLATFORMS, Platform } from '../entities/build.entity'
import { DownloadLog } from '../entities/download-log.entity'
import { appToItem, buildsDesc, buildToDto } from '../serialize'
import { StorageService } from '../storage/storage.service'

function genShareId(): string {
  return randomBytes(4).toString('hex').slice(0, 6) // 6 位 [a-f0-9] ⊂ [a-z0-9]
}

// 本地日期 "YYYY-MM-DD"（统计按天聚合，与服务器时区一致）
function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

@Injectable()
export class AppsService {
  constructor(
    @InjectRepository(App) private readonly apps: Repository<App>,
    @InjectRepository(Build) private readonly builds: Repository<Build>,
    @InjectRepository(DownloadLog) private readonly downloadLogs: Repository<DownloadLog>,
    private readonly storage: StorageService,
  ) {}

  private async loadWithBuilds(id: number): Promise<App> {
    const app = await this.apps.findOne({ where: { id }, relations: { builds: true } })
    if (!app) throw new NotFoundException('应用不存在')
    return app
  }

  async list(q?: string, platform?: string) {
    if (platform && !PLATFORMS.includes(platform as Platform)) {
      throw new BadRequestException('platform 不合法')
    }
    const qb = this.apps
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.builds', 'b')
      .orderBy('a.updatedAt', 'DESC')
    if (q) {
      qb.andWhere('a.name LIKE :q OR a.bundleId LIKE :q', { q: `%${q}%` })
    }
    if (platform) {
      // 按"存在该平台的构建"筛选
      qb.andWhere(
        'a.id IN (SELECT b2.appId FROM builds b2 WHERE b2.platform = :platform)',
        { platform },
      )
    }
    const apps = await qb.getMany()
    return apps.map(appToItem)
  }

  async create(
    body: { name?: string; bundleId?: string; description?: string },
    createdBy?: string,
  ) {
    if (!body?.name || !body?.bundleId) {
      throw new BadRequestException('name 和 bundleId 必填')
    }
    const exists = await this.apps.findOne({ where: { bundleId: body.bundleId } })
    if (exists) throw new ConflictException('bundleId 已存在')
    let app: App | undefined
    for (let i = 0; i < 10; i++) {
      try {
        app = await this.apps.save(
          this.apps.create({
            name: body.name,
            bundleId: body.bundleId,
            description: body.description ?? null,
            shareId: genShareId(),
            createdBy: createdBy || null,
          }),
        )
        break
      } catch (e: any) {
        if (i === 9) throw e // shareId 碰撞重试
      }
    }
    return appToItem(await this.loadWithBuilds(app!.id))
  }

  async get(id: number) {
    const app = await this.loadWithBuilds(id)
    return { ...appToItem(app), builds: buildsDesc(app).map(buildToDto) }
  }

  async update(id: number, body: { name?: string; description?: string; sharePassword?: string }) {
    const app = await this.loadWithBuilds(id)
    if (body?.name !== undefined) app.name = body.name
    if (body?.description !== undefined) app.description = body.description
    // v2：sharePassword 非空 = 设置，"" = 清除；密码值不回传（appToItem 只带 shareProtected）
    if (body?.sharePassword !== undefined) {
      app.sharePassword = body.sharePassword === '' ? null : body.sharePassword
    }
    await this.apps.save(app)
    return appToItem(await this.loadWithBuilds(id))
  }

  // v2：下载统计。total/byPlatform 基于 build.downloadCount（含 v1 时代的历史下载，当时无日志表）；
  // daily 基于 DownloadLog（新表，自 v2 启用起逐次记录）
  async stats(id: number) {
    const app = await this.loadWithBuilds(id)
    const byPlatform = { android: 0, ios: 0, harmony: 0 }
    let total = 0
    for (const b of app.builds ?? []) {
      total += b.downloadCount
      if (b.platform in byPlatform) byPlatform[b.platform] += b.downloadCount
    }
    const logs = await this.downloadLogs.find({ where: { appId: id } })
    const dailyCount = new Map<string, number>()
    for (const log of logs) {
      const date = ymd(log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt))
      dailyCount.set(date, (dailyCount.get(date) ?? 0) + 1)
    }
    const daily: Array<{ date: string; count: number }> = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = ymd(new Date(now.getTime() - i * 24 * 60 * 60 * 1000))
      daily.push({ date, count: dailyCount.get(date) ?? 0 })
    }
    return { total, byPlatform, daily }
  }

  async remove(id: number) {
    const app = await this.loadWithBuilds(id)
    // 手动删除存储文件（DB 级联由外键处理，这里兜底删构建记录与下载日志）
    for (const b of app.builds ?? []) {
      await this.storage.deleteBuild(b.storedName)
    }
    if (app.iconUrl) {
      await this.storage.deleteIcon(app.iconUrl)
    }
    await this.downloadLogs.delete({ appId: app.id })
    await this.builds.delete({ appId: app.id })
    await this.apps.remove(app)
  }

  async uploadIcon(id: number, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('缺少文件')
    const app = await this.loadWithBuilds(id)
    // 先转存新图标（s3 模式 multer 临时文件在成功后清理），再删旧图标
    const iconUrl = await this.storage.saveIcon(file.filename)
    if (app.iconUrl) {
      await this.storage.deleteIcon(app.iconUrl)
    }
    app.iconUrl = iconUrl
    await this.apps.save(app)
    return { iconUrl: app.iconUrl }
  }
}
