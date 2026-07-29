import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany } from 'typeorm';
import { Puzzle } from '../../puzzles/entities/puzzle.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToMany(() => Puzzle, (puzzle) => puzzle.tags)
  puzzles!: Puzzle[];
}
