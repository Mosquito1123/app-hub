import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { randomBytes } from 'crypto'
import * as path from 'path'
import { App } from '../entities/app.entity'
import { Build, PLATFORMS, Platform } from '../entities/build.entity'
import { appToItem, buildsDesc, buildToDto } from '../serialize'
import { BUILDS_DIR, ICONS_DIR } from '../config'
import { safeUnlink } from '../utils/file.util'

function genShareId(): string {
  return randomBytes(4).toString('hex').slice(0, 6) // 6 位 [a-f0-9] ⊂ [a-z0-9]
}

@Injectable()
export class AppsService {
  constructor(
    @InjectRepository(App) private readonly apps: Repository<App>,
    @InjectRepository(Build) private readonly builds: Repository<Build>,
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

  async create(body: { name?: string; bundleId?: string; description?: string }) {
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

  async update(id: number, body: { name?: string; description?: string }) {
    const app = await this.loadWithBuilds(id)
    if (body?.name !== undefined) app.name = body.name
    if (body?.description !== undefined) app.description = body.description
    await this.apps.save(app)
    return appToItem(await this.loadWithBuilds(id))
  }

  async remove(id: number) {
    const app = await this.loadWithBuilds(id)
    // 手动删除磁盘文件（DB 级联由外键处理，这里兜底删构建记录）
    for (const b of app.builds ?? []) {
      safeUnlink(path.join(BUILDS_DIR, b.storedName))
    }
    if (app.iconUrl) {
      safeUnlink(path.join(ICONS_DIR, path.basename(app.iconUrl)))
    }
    await this.builds.delete({ appId: app.id })
    await this.apps.remove(app)
  }

  async uploadIcon(id: number, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('缺少文件')
    const app = await this.loadWithBuilds(id)
    if (app.iconUrl) {
      safeUnlink(path.join(ICONS_DIR, path.basename(app.iconUrl)))
    }
    app.iconUrl = `/uploads/icons/${file.filename}`
    await this.apps.save(app)
    return { iconUrl: app.iconUrl }
  }
}
