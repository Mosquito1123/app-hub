import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { AppsService } from './apps.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ICONS_DIR } from '../config'
import { ICON_EXTS, getFileExt, randomFileName } from '../utils/file.util'

const MAX_ICON_SIZE = 2 * 1024 * 1024 // 2MB

@Controller('apps')
@UseGuards(JwtAuthGuard)
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get()
  list(@Query('q') q?: string, @Query('platform') platform?: string) {
    return this.appsService.list(q, platform)
  }

  @Post()
  create(@Body() body: { name?: string; bundleId?: string; description?: string }) {
    return this.appsService.create(body)
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.appsService.get(id)
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.appsService.update(id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.appsService.remove(id)
  }

  @Post(':id/icon')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: ICONS_DIR,
        filename: (_req, file, cb) => cb(null, randomFileName(file.originalname)),
      }),
      limits: { fileSize: MAX_ICON_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ICON_EXTS.includes(getFileExt(file.originalname))) {
          cb(new BadRequestException('仅支持 png/jpg/jpeg/svg'), false)
          return
        }
        cb(null, true)
      },
    }),
  )
  uploadIcon(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.appsService.uploadIcon(id, file)
  }
}
