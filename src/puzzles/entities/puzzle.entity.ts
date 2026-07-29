import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Tag } from '../../tags/entities/tag.entity';

export enum SubmissionStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('puzzles')
export class Puzzle {
  @ApiProperty({ example: 'uuid-puzzle-id', description: 'Puzzle UUID' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'The Missing Key', description: 'Puzzle title' })
  @Column()
  title!: string;

  @ApiProperty({ example: 'Find the key that unlocks the vault using logical deduction.', description: 'Full puzzle description' })
  @Column()
  description!: string;

  @ApiProperty({ example: 'medium', description: 'Difficulty level (easy | medium | hard)' })
  @Column()
  difficulty!: string;

  @ApiPropertyOptional({ description: 'Category this puzzle belongs to', nullable: true })
  @ManyToOne(() => Category, (category) => category.puzzles, { nullable: true, onDelete: 'SET NULL' })
  category!: Category | null;

  @ApiProperty({ example: { type: 'sequence', values: [1, 2, 3, 5, 8] }, description: 'Win conditions JSON' })
  @Column({ type: 'json', nullable: true })
  conditions!: any;

  @ApiProperty({ example: { scoreMultiplier: 1.5 }, description: 'Effects / rewards JSON applied on completion' })
  @Column({ type: 'json', nullable: true })
  effects!: any;

  @ApiProperty({ example: 'uuid-author-id', description: 'UUID of the user who created this puzzle' })
  @Column()
  authorId!: string;

  @ApiProperty({ enum: SubmissionStatus, example: SubmissionStatus.APPROVED, description: 'Review/publication status' })
  @Column({ type: 'enum', enum: SubmissionStatus, default: SubmissionStatus.APPROVED })
  submissionStatus!: SubmissionStatus;

  @ApiPropertyOptional({ example: 'Duplicate of an existing puzzle.', nullable: true, description: 'Reason provided when the puzzle was rejected' })
  @Column({ nullable: true })
  rejectionReason!: string;

  @ApiPropertyOptional({ type: () => [Tag], description: 'Tags associated with this puzzle' })
  @ManyToMany(() => Tag, (tag) => tag.puzzles)
  @JoinTable({
    name: 'puzzle_tags',
    joinColumn: { name: 'puzzleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags!: Tag[];

  @ApiProperty({ example: '2024-03-01T12:00:00.000Z', description: 'Puzzle creation timestamp' })
  @CreateDateColumn()
  createdAt!: Date;
}
