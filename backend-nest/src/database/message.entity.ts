import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() fromId!: string;
  @Column() fromName!: string;
  @Column() toId!: string;
  @Column() toName!: string;
  @Column('text') content!: string;
  @Column({ default: false }) read!: boolean;
  @CreateDateColumn() createdAt!: Date;
}
