import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { App } from './app.entity'

export type Platform = 'ios' | 'android' | 'harmony'

export const PLATFORMS: Platform[] = ['ios', 'android', 'harmony']

@Entity('builds')
export class Build {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  appId: number

  @ManyToOne(() => App, (a) => a.builds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appId' })
  app: App

  @Column()
  platform: Platform

  @Column()
  version: string

  @Column({ type: 'text', nullable: true })
  buildNumber: string | null

  @Column({ type: 'text', nullable: true })
  channel: string | null

  @Column({ type: 'text', nullable: true })
  releaseNotes: string | null

  @Column()
  fileName: string

  @Column()
  fileExt: string

  @Column()
  fileSize: number

  @Column({ default: 0 })
  downloadCount: number

  // 磁盘上的实际文件名（不对外暴露）
  @Column()
  storedName: string

  // v3：上传者用户名快照（null = 旧数据）
  @Column({ type: 'text', nullable: true })
  createdBy: string | null

  @CreateDateColumn()
  createdAt: Date
}
