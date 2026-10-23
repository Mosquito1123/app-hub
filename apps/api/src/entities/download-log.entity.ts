import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { App } from './app.entity'
import { Platform } from './build.entity'

@Entity('download_logs')
export class DownloadLog {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  appId: number

  @ManyToOne(() => App, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appId' })
  app: App

  @Column()
  buildId: number

  @Column()
  platform: Platform

  @CreateDateColumn()
  createdAt: Date
}
