import * as fs from 'fs'
import * as path from 'path'
import { randomBytes } from 'crypto'

export const BUILD_EXTS = ['ipa', 'apk', 'hap', 'app', 'zip', 'tar.gz']
export const ICON_EXTS = ['png', 'jpg', 'jpeg', 'svg']

// 小写扩展名；tar.gz 记为 "tar.gz"
export function getFileExt(originalName: string): string {
  const lower = originalName.toLowerCase()
  if (lower.endsWith('.tar.gz')) return 'tar.gz'
  return path.extname(lower).slice(1)
}

// 生成磁盘文件名：Date.now()-random.ext
export function randomFileName(originalName: string): string {
  const ext = getFileExt(originalName)
  return `${Date.now()}-${randomBytes(4).toString('hex')}${ext ? '.' + ext : ''}`
}

export function safeUnlink(filePath: string) {
  try {
    fs.unlinkSync(filePath)
  } catch {
    // 文件不存在等容错
  }
}
