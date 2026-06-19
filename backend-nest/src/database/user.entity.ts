import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ default: 'Member' })
  role!: string;

  @Column({ nullable: true, type: 'varchar' })
  resetToken!: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  resetTokenExpiry!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
