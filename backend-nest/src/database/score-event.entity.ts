import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('score_events')
@Index(['userId', 'action', 'entityId'], { unique: true })
export class ScoreEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  entityId: string;

  @Column()
  points: number;

  @CreateDateColumn()
  createdAt: Date;
}
