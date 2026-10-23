import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { App } from '../entities/app.entity'
import { Build } from '../entities/build.entity'
import { StorageModule } from '../storage/storage.module'
import { BuildsService } from './builds.service'
import { BuildsController } from './builds.controller'

@Module({
  imports: [TypeOrmModule.forFeature([App, Build]), StorageModule],
  controllers: [BuildsController],
  providers: [BuildsService],
})
export class BuildsModule {}
