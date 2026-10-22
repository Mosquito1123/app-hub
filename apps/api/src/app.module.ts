import { Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DB_FILE } from './config'
import { AuthModule } from './auth/auth.module'
import { AuthService } from './auth/auth.service'
import { AppsModule } from './apps/apps.module'
import { BuildsModule } from './builds/builds.module'
import { PublicModule } from './public/public.module'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: DB_FILE,
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    AppsModule,
    BuildsModule,
    PublicModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly authService: AuthService) {}

  async onModuleInit() {
    await this.authService.ensureAdmin()
  }
}
