import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { App } from '../entities/app.entity'
import { Build } from '../entities/build.entity'
import { AppsService } from './apps.service'
import { AppsController } from './apps.controller'

@Module({
  imports: [TypeOrmModule.forFeature([App, Build])],
  controllers: [AppsController],
  providers: [AppsService],
})
export class AppsModule {}
