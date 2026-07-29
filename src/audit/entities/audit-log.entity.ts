import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  actorId!: string;

  @Column()
  action!: string;

  @Column({ nullable: true })
  targetEntity!: string;

  @Column({ nullable: true })
  targetId!: string;

  @Column({ type: 'json', nullable: true })
  payload!: object;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp!: Date;
}
