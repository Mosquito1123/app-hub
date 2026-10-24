import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import { AppModule } from './app.module'
import { ICONS_DIR, PORT } from './config'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.setGlobalPrefix('api')
  app.enableCors({ origin: true })

  // 只静态托管图标目录（构建包在 app-builds/ 下，不静态暴露）
  app.useStaticAssets(join(process.cwd(), ICONS_DIR), { prefix: '/uploads/icons/' })

  // 生产模式：托管前端构建产物，SPA fallback
  const webDist = join(__dirname, '../../web/dist')
  if (existsSync(join(webDist, 'index.html'))) {
    app.useStaticAssets(webDist, { index: 'index.html' })
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next()
      }
      // 防路径穿越：解析后必须仍在 webDist 内，且真实文件不存在时回退 index.html
      // 回退覆盖 /admin/*、/d/* 等前端路由，API 与上传目录不在此处理
      const target = resolve(webDist, `.${req.path}`)
      if (!target.startsWith(webDist) || !existsSync(target)) {
        res.sendFile(join(webDist, 'index.html'))
        return
      }
      next()
    })
  }

  await app.listen(PORT)
  console.log(`AppHub API running on http://localhost:${PORT}/api`)
}
bootstrap()
