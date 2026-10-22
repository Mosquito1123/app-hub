import * as fs from 'fs'
import * as path from 'path'

export const PORT = Number(process.env.PORT || 3000)
export const DB_FILE = process.env.DB_FILE || 'data/apphub.sqlite'
export const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads'
export const BUILDS_DIR = path.join(UPLOAD_DIR, 'app-builds')
export const ICONS_DIR = path.join(UPLOAD_DIR, 'icons')
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
export const JWT_SECRET = process.env.JWT_SECRET || 'apphub-dev-secret'

// 自动建目录（数据库文件目录 + 上传目录）
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
fs.mkdirSync(BUILDS_DIR, { recursive: true })
fs.mkdirSync(ICONS_DIR, { recursive: true })
