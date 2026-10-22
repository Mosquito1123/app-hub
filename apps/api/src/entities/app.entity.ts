import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm'
import { Build } from './build.entity'

@Entity('apps')
@Unique(['bundleId'])
@Unique(['shareId'])
export class App {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  bundleId: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'text', nullable: true })
  iconUrl: string | null

  @Column()
  shareId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => Build, (b) => b.app)
  builds: Build[]
}
