import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

export enum ConditionType {
  PUZZLES_SOLVED = 'puzzles_solved',
  HARD_PUZZLES_WITHOUT_HINTS = 'hard_puzzles_without_hints',
}

export enum Rarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
}

@Entity('achievements')
@Unique(['name'])
export class Achievement {
  @ApiProperty({ example: 'uuid-achievement-id', description: 'Achievement UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'First Blood', description: 'Achievement display name' })
  @Column()
  name: string;

  @ApiProperty({ example: 'Solve your first puzzle.', description: 'Achievement description shown to players' })
  @Column()
  description: string;

  @ApiProperty({ enum: ConditionType, example: ConditionType.PUZZLES_SOLVED, description: 'The condition type that must be met to unlock this achievement' })
  @Column({ type: 'enum', enum: ConditionType })
  conditionType: ConditionType;

  @ApiProperty({ example: 1, description: 'Numeric threshold that must be reached to unlock (e.g. solve 10 puzzles)' })
  @Column('int')
  threshold: number;

  @ApiProperty({ enum: Rarity, example: Rarity.COMMON, description: 'Achievement rarity tier' })
  @Column({ type: 'enum', enum: Rarity })
  rarity: Rarity;
}
