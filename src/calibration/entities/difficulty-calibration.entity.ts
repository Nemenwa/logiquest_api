import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Puzzle } from '../../puzzles/entities/puzzle.entity';

export enum CalibrationStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  DISMISSED = 'dismissed',
}

@Entity('difficulty_calibrations')
export class DifficultyCalibration {
  @ApiProperty({ example: 'uuid-calibration-id', description: 'Calibration record UUID' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @ManyToOne(() => Puzzle, { onDelete: 'CASCADE' })
  puzzle!: Puzzle;

  @ApiProperty({ example: 'uuid-puzzle-id', description: 'UUID of the puzzle this calibration applies to' })
  @Column()
  puzzleId!: string;

  @ApiProperty({ example: 350, description: 'Total number of gameplay sessions analysed' })
  @Column({ type: 'int', default: 0 })
  totalSessions!: number;

  @ApiProperty({ example: 210, description: 'Sessions that ended in a successful solve' })
  @Column({ type: 'int', default: 0 })
  completedSessions!: number;

  @ApiProperty({ example: 140, description: 'Sessions that were abandoned before completion' })
  @Column({ type: 'int', default: 0 })
  abandonedSessions!: number;

  @ApiProperty({ example: 0.6, description: 'Fraction of sessions that ended in a solve (0–1)' })
  @Column({ type: 'float', default: 0 })
  solveRate!: number;

  @ApiProperty({ example: 0.4, description: 'Fraction of sessions that were abandoned (0–1)' })
  @Column({ type: 'float', default: 0 })
  abandonRate!: number;

  @ApiProperty({ example: 732.5, description: 'Average session duration in seconds' })
  @Column({ type: 'float', default: 0 })
  avgDurationSeconds!: number;

  @ApiProperty({ example: 1.8, description: 'Average number of hints used per session' })
  @Column({ type: 'float', default: 0 })
  avgHintsUsed!: number;

  @ApiProperty({ example: 0.72, description: 'Composite calibration score used to determine the recommendation' })
  @Column({ type: 'float', default: 0 })
  calibrationScore!: number;

  @ApiProperty({ example: 'easy', description: 'Current difficulty label of the puzzle' })
  @Column()
  currentDifficulty!: string;

  @ApiProperty({ example: 'medium', description: 'Algorithm-recommended difficulty label' })
  @Column()
  recommendedDifficulty!: string;

  @ApiProperty({ enum: CalibrationStatus, example: CalibrationStatus.PENDING, description: 'Whether the recommendation has been actioned' })
  @Column({
    type: 'enum',
    enum: CalibrationStatus,
    default: CalibrationStatus.PENDING,
  })
  status!: CalibrationStatus;

  @ApiProperty({ example: '2024-07-01T00:00:00.000Z', description: 'Timestamp when this calibration was last evaluated' })
  @CreateDateColumn()
  evaluatedAt!: Date;
}
