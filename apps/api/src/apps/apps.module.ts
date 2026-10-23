import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { App } from '../entities/app.entity'
import { Build } from '../entities/build.entity'
import { DownloadLog } from '../entities/download-log.entity'
import { StorageModule } from '../storage/storage.module'
import { AppsService } from './apps.service'
import { AppsController } from './apps.controller'

@Module({
  imports: [TypeOrmModule.forFeature([App, Build, DownloadLog]), StorageModule],
  controllers: [AppsController],
  providers: [AppsService],
})
export class AppsModule {}
