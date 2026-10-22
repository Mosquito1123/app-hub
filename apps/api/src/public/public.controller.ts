import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseIntPipe,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'
import { App } from '../entities/app.entity'
import { Build } from '../entities/build.entity'
import { buildsDesc, buildToDto } from '../serialize'
import { BUILDS_DIR } from '../config'

@Controller('public')
export class PublicController {
  constructor(
    @InjectRepository(App) private readonly apps: Repository<App>,
    @InjectRepository(Build) private readonly builds: Repository<Build>,
  ) {}

  // GET /api/public/apps/:shareId
  @Get('apps/:shareId')
  async getPublicApp(@Param('shareId') shareId: string) {
    const app = await this.apps.findOne({ where: { shareId }, relations: { builds: true } })
    if (!app) throw new NotFoundException('应用不存在')
    const { id, name, bundleId, description, iconUrl, createdAt, updatedAt } = app
    const iso = (v: Date | string) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString())
    return {
      app: {
        id,
        name,
        bundleId,
        description: description ?? null,
        iconUrl: iconUrl ?? null,
        shareId,
        createdAt: iso(createdAt),
        updatedAt: iso(updatedAt),
      },
      builds: buildsDesc(app).map(buildToDto),
    }
  }

  // GET /api/public/builds/:buildId/download
  @Get('builds/:buildId/download')
  async download(
    @Param('buildId', ParseIntPipe) buildId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const build = await this.builds.findOne({ where: { id: buildId } })
    if (!build) throw new NotFoundException('构建不存在')
    const filePath = path.join(BUILDS_DIR, build.storedName)
    if (!fs.existsSync(filePath)) throw new NotFoundException('文件不存在')
    build.downloadCount += 1
    await this.builds.save(build)
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(build.fileName)}`,
    })
    return new StreamableFile(fs.createReadStream(filePath))
  }

  // GET /api/public/builds/:buildId/ios-manifest.plist
  @Get('builds/:buildId/ios-manifest.plist')
  @Header('Content-Type', 'application/xml')
  async iosManifest(
    @Param('buildId', ParseIntPipe) buildId: number,
    @Req() req: Request,
  ): Promise<string> {
    const build = await this.builds.findOne({ where: { id: buildId }, relations: { app: true } })
    if (!build || !build.app) throw new NotFoundException('构建不存在')
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol
    const downloadUrl = `${proto}://${req.headers.host}/api/public/builds/${build.id}/download`
    return buildManifestPlist(build.app.bundleId, build.version, downloadUrl, build.app.name)
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildManifestPlist(
  bundleId: string,
  bundleVersion: string,
  downloadUrl: string,
  title: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>items</key>
\t<array>
\t\t<dict>
\t\t\t<key>assets</key>
\t\t\t<array>
\t\t\t\t<dict>
\t\t\t\t\t<key>kind</key>
\t\t\t\t\t<string>software-package</string>
\t\t\t\t\t<key>url</key>
\t\t\t\t\t<string>${escapeXml(downloadUrl)}</string>
\t\t\t\t</dict>
\t\t\t</array>
\t\t\t<key>metadata</key>
\t\t\t<dict>
\t\t\t\t<key>bundle-identifier</key>
\t\t\t\t<string>${escapeXml(bundleId)}</string>
\t\t\t\t<key>bundle-version</key>
\t\t\t\t<string>${escapeXml(bundleVersion)}</string>
\t\t\t\t<key>kind</key>
\t\t\t\t<string>software</string>
\t\t\t\t<key>title</key>
\t\t\t\t<string>${escapeXml(title)}</string>
\t\t\t</dict>
\t\t</dict>
\t</array>
</dict>
</plist>
`
}
