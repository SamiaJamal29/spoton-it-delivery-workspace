import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkItem } from './work-item.entity';

export type QaStatus = 'pending' | 'passed' | 'failed';

@Entity('qa_checks')
export class QaCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workItemId: string;

  @ManyToOne(() => WorkItem, (item) => item.qaChecks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workItemId' })
  workItem: WorkItem;

  @Column()
  testTitle: string;

  @Column({ type: 'text', nullable: true })
  expectedResult: string;

  @Column({ type: 'text', nullable: true })
  actualResult: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: QaStatus;

  @Column({ nullable: true })
  tester: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
