import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Puzzle } from './puzzle.entity';

/**
 * Stores a translated version of a Puzzle's user-visible content.
 * The base Puzzle row is treated as the English (en) source of truth;
 * all other locales require a PuzzleTranslation row.
 *
 * `hints` mirrors the in-memory hint structure used by HintsService:
 * an ordered array of `{ order: number; content: string }` objects.
 */
@Entity('puzzle_translations')
@Unique(['puzzleId', 'locale'])
@Index(['locale'])
export class PuzzleTranslation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  puzzleId!: string;

  @ManyToOne(() => Puzzle, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'puzzleId' })
  puzzle!: Puzzle;

  @Column()
  @Index()
  locale!: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  /**
   * Translated hints array. Shape: `[{ order: 1, content: "..." }, ...]`
   * Nullable so admins can supply partial translations (title+description only).
   */
  @Column({ type: 'json', nullable: true })
  hints!: Array<{ order: number; content: string }> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
