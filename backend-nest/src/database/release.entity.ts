import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { WorkItem } from './work-item.entity';

export type DeploymentStatus = 'draft' | 'scheduled' | 'deployed' | 'rolled_back';

@Entity('releases')
export class Release {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  version: string;

  @Column({ type: 'date', nullable: true })
  releaseDate: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'varchar', default: 'draft' })
  deploymentStatus: DeploymentStatus;

  @ManyToMany(() => WorkItem)
  @JoinTable({
    name: 'release_work_items',
    joinColumn: { name: 'releaseId' },
    inverseJoinColumn: { name: 'workItemId' },
  })
  workItems: WorkItem[];

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
