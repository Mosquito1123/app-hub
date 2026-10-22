import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { App } from '../entities/app.entity'
import { Build } from '../entities/build.entity'
import { PublicController } from './public.controller'

@Module({
  imports: [TypeOrmModule.forFeature([App, Build])],
  controllers: [PublicController],
})
export class PublicModule {}
