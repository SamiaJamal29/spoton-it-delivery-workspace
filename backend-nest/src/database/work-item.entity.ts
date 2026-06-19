import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { QaCheck } from './qa-check.entity';

export type WorkItemType = 'feature' | 'bug' | 'improvement' | 'maintenance';
export type WorkItemStatus =
  | 'backlog'
  | 'planned'
  | 'in_progress'
  | 'qa'
  | 'ready_for_release'
  | 'released';
export type WorkItemPriority = 'low' | 'medium' | 'high' | 'urgent';

@Entity('work_items')
export class WorkItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', default: 'feature' })
  type: WorkItemType;

  @Column({ type: 'varchar', default: 'backlog' })
  status: WorkItemStatus;

  @Column({ type: 'varchar', default: 'medium' })
  priority: WorkItemPriority;

  @Column({ nullable: true })
  assignee: string;

  @Column({ nullable: true, type: 'date' })
  dueDate: string;

  @Column()
  createdBy: string;

  @Column({ nullable: true })
  projectId: string;

  @OneToMany(() => QaCheck, (qa) => qa.workItem, { cascade: true })
  qaChecks: QaCheck[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
