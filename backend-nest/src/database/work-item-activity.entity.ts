import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('work_item_activities')
export class WorkItemActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workItemId: string;

  @Column()
  changedById: string;

  @Column()
  changedByName: string;

  @Column()
  fromStatus: string;

  @Column()
  toStatus: string;

  @CreateDateColumn()
  createdAt: Date;
}
