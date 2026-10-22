import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { BuildsService } from './builds.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { BUILDS_DIR } from '../config'
import { BUILD_EXTS, getFileExt, randomFileName } from '../utils/file.util'

const MAX_BUILD_SIZE = 500 * 1024 * 1024 // 500MB

@Controller()
export class BuildsController {
  constructor(private readonly buildsService: BuildsService) {}

  @Post('apps/:id/builds')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: BUILDS_DIR,
        filename: (_req, file, cb) => cb(null, randomFileName(file.originalname)),
      }),
      limits: { fileSize: MAX_BUILD_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!BUILD_EXTS.includes(getFileExt(file.originalname))) {
          cb(new BadRequestException('扩展名不支持，仅允许 ipa/apk/hap/app/zip/tar.gz'), false)
          return
        }
        cb(null, true)
      },
    }),
  )
  create(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body()
    body: {
      platform?: string
      version?: string
      buildNumber?: string
      channel?: string
      releaseNotes?: string
    },
  ) {
    return this.buildsService.create(id, file, body)
  }

  @Delete('builds/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.buildsService.remove(id)
  }
}
