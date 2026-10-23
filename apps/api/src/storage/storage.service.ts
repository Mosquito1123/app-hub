import { Injectable, Logger } from '@nestjs/common'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as fs from 'fs'
import * as path from 'path'
import { BUILDS_DIR, ICONS_DIR, STORAGE_DRIVER } from '../config'
import { safeUnlink } from '../utils/file.util'

export type DownloadTarget =
  | { redirect: string; filePath?: undefined } // s3：302 到预签名 URL
  | { redirect?: undefined; filePath: string } // local：本地流式文件路径

const PRESIGNED_EXPIRES_SECONDS = 3600

/**
 * v2 存储驱动：
 * - local（默认）：与 v1 完全一致，文件留在 UPLOAD_DIR 下，下载走本地流式
 * - s3：上传落盘后转存 S3 并删除本地临时文件；下载 302 到预签名 URL；删除时同步 DeleteObject
 *
 * local 模式绝不构造 S3 客户端、绝不读取 S3_* 环境变量、不连网。
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private s3: S3Client | null = null
  private bucket = ''
  private publicBaseUrl: string | null = null

  constructor() {
    if (STORAGE_DRIVER === 's3') {
      this.bucket = process.env.S3_BUCKET || ''
      this.publicBaseUrl = (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/+$/, '') || null
      this.s3 = new S3Client({
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: Boolean(process.env.S3_ENDPOINT),
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY || '',
          secretAccessKey: process.env.S3_SECRET_KEY || '',
        },
      })
      this.logger.log(`Storage driver: s3 (bucket=${this.bucket})`)
    }
  }

  // ---------- 构建包 ----------

  // multer 已落盘 BUILDS_DIR/<localName>；返回入库的 storedName（local: 文件名，s3: 对象 key）
  async saveBuild(localName: string): Promise<string> {
    if (!this.s3) return localName
    const key = `app-builds/${localName}`
    await this.putObject(key, path.join(BUILDS_DIR, localName))
    safeUnlink(path.join(BUILDS_DIR, localName))
    return key
  }

  async deleteBuild(storedName: string): Promise<void> {
    if (this.s3) {
      await this.deleteObject(storedName)
      safeUnlink(path.join(BUILDS_DIR, path.basename(storedName))) // 兜底清理历史 local 模式遗留文件
      return
    }
    safeUnlink(path.join(BUILDS_DIR, storedName))
  }

  // 下载目标：s3 返回预签名 URL（调用方 302），local 返回本地文件路径（调用方流式响应）
  async getDownload(storedName: string): Promise<DownloadTarget> {
    if (!this.s3) return { filePath: path.join(BUILDS_DIR, storedName) }
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: storedName }),
      { expiresIn: PRESIGNED_EXPIRES_SECONDS },
    )
    return { redirect: url }
  }

  // ---------- 图标 ----------

  // multer 已落盘 ICONS_DIR/<localName>；返回入库的 iconUrl
  // - local：/uploads/icons/<name>（与 v1 一致）
  // - s3 + S3_PUBLIC_BASE_URL：转存后删本地临时文件，返回 <base>/icons/<name> 绝对地址
  // - s3 无 PUBLIC_BASE_URL：转存 S3，但保留本地副本，仍走 /uploads/icons/<name> 静态托管
  async saveIcon(localName: string): Promise<string> {
    if (!this.s3) return `/uploads/icons/${localName}`
    const key = `icons/${localName}`
    await this.putObject(key, path.join(ICONS_DIR, localName))
    if (this.publicBaseUrl) {
      safeUnlink(path.join(ICONS_DIR, localName))
      return `${this.publicBaseUrl}/${key}`
    }
    return `/uploads/icons/${localName}`
  }

  // 入库的 iconUrl（/uploads/...、绝对地址或历史值）都能容错删除
  async deleteIcon(iconUrl: string): Promise<void> {
    const base = path.basename(iconUrl.split('?')[0])
    if (this.s3) await this.deleteObject(`icons/${base}`)
    safeUnlink(path.join(ICONS_DIR, base))
  }

  // ---------- S3 内部实现 ----------

  private async putObject(key: string, filePath: string): Promise<void> {
    if (!this.s3) return
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: fs.createReadStream(filePath),
        }),
      )
    } catch (e) {
      safeUnlink(filePath) // 转存失败时清理本地临时文件
      throw e
    }
  }

  // 删除采用 best-effort：对象不存在等容错，不阻塞记录删除
  private async deleteObject(key: string): Promise<void> {
    if (!this.s3) return
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
    } catch (e) {
      this.logger.warn(`S3 DeleteObject 失败（已忽略）: ${key}: ${String(e)}`)
    }
  }
}
