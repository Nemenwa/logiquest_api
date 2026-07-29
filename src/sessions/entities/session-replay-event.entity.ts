import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Represents a single recorded event that occurred during a puzzle session.
 * Events are appended as the session progresses and can be replayed in order
 * to reconstruct the entire session timeline.
 */
export enum ReplayEventType {
  SESSION_STARTED = 'SESSION_STARTED',
  HINT_REVEALED = 'HINT_REVEALED',
  SOLUTION_SUBMITTED = 'SOLUTION_SUBMITTED',
  SESSION_COMPLETED = 'SESSION_COMPLETED',
  SESSION_ABANDONED = 'SESSION_ABANDONED',
}

@Entity('session_replay_events')
@Index(['sessionId', 'sequence'])
export class SessionReplayEvent {
  @ApiProperty({ example: 'uuid-event-id', description: 'Replay event UUID' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'uuid-session-id', description: 'UUID of the session this event belongs to' })
  @Column()
  @Index()
  sessionId!: string;

  @ApiProperty({ example: 'uuid-user-id', description: 'UUID of the user who owns the session' })
  @Column()
  userId!: string;

  @ApiProperty({ example: 'uuid-puzzle-id', description: 'UUID of the puzzle being attempted' })
  @Column()
  puzzleId!: string;

  @ApiProperty({ example: 3, description: 'Monotonically increasing counter within a session (starts at 1)' })
  @Column({ type: 'int' })
  sequence!: number;

  @ApiProperty({ enum: ReplayEventType, example: ReplayEventType.HINT_REVEALED, description: 'Type of event recorded' })
  @Column({ type: 'varchar', length: 64 })
  eventType!: ReplayEventType;

  @ApiPropertyOptional({ example: { hintIndex: 1 }, nullable: true, description: 'Arbitrary JSON payload for event-specific data' })
  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @ApiProperty({ example: '2024-07-01T10:05:00.000Z', description: 'Wall-clock timestamp of when the event occurred' })
  @CreateDateColumn()
  occurredAt!: Date;
}
