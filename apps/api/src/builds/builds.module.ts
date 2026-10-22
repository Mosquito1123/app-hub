import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { App } from '../entities/app.entity'
import { Build } from '../entities/build.entity'
import { BuildsService } from './builds.service'
import { BuildsController } from './builds.controller'

@Module({
  imports: [TypeOrmModule.forFeature([App, Build])],
  controllers: [BuildsController],
  providers: [BuildsService],
})
export class BuildsModule {}
