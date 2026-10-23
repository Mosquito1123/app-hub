import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as path from 'path'
import { App } from '../entities/app.entity'
import { Build, PLATFORMS, Platform } from '../entities/build.entity'
import { buildToDto } from '../serialize'
import { BUILDS_DIR } from '../config'
import { StorageService } from '../storage/storage.service'
import { getFileExt, safeUnlink } from '../utils/file.util'

@Injectable()
export class BuildsService {
  constructor(
    @InjectRepository(App) private readonly apps: Repository<App>,
    @InjectRepository(Build) private readonly builds: Repository<Build>,
    private readonly storage: StorageService,
  ) {}

  async create(
    appId: number,
    file: Express.Multer.File | undefined,
    body: {
      platform?: string
      version?: string
      buildNumber?: string
      channel?: string
      releaseNotes?: string
    },
  ) {
    const app = await this.apps.findOne({ where: { id: appId } })
    if (!app) {
      if (file) safeUnlink(path.join(BUILDS_DIR, file.filename))
      throw new NotFoundException('应用不存在')
    }
    if (!file) throw new BadRequestException('缺少文件')
    if (!body?.platform || !PLATFORMS.includes(body.platform as Platform)) {
      safeUnlink(path.join(BUILDS_DIR, file.filename))
      throw new BadRequestException('platform 必填且不合法（ios/android/harmony）')
    }
    if (!body?.version) {
      safeUnlink(path.join(BUILDS_DIR, file.filename))
      throw new BadRequestException('version 必填')
    }
    // v2：经存储驱动落库（local 保持原文件名；s3 转存后删除本地临时文件，storedName 存对象 key）
    const storedName = await this.storage.saveBuild(file.filename)
    const build = await this.builds.save(
      this.builds.create({
        appId: app.id,
        platform: body.platform as Platform,
        version: body.version,
        buildNumber: emptyToNull(body.buildNumber),
        channel: emptyToNull(body.channel),
        releaseNotes: emptyToNull(body.releaseNotes),
        fileName: file.originalname,
        fileExt: getFileExt(file.originalname),
        fileSize: file.size,
        storedName,
      }),
    )
    return buildToDto(build)
  }

  async remove(id: number) {
    const build = await this.builds.findOne({ where: { id } })
    if (!build) throw new NotFoundException('构建不存在')
    await this.storage.deleteBuild(build.storedName)
    await this.builds.delete({ id })
  }
}

function emptyToNull(v: string | undefined): string | null {
  const s = (v ?? '').trim()
  return s === '' ? null : s
}
