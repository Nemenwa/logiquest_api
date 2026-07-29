import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ReplayEventType } from '../entities/session-replay-event.entity';

export class RecordReplayEventDto {
  @ApiProperty({ example: 'uuid-session', description: 'UUID of the session this event belongs to' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({ example: 'uuid-user', description: 'UUID of the user who owns the session' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'uuid-puzzle', description: 'UUID of the puzzle being attempted' })
  @IsString()
  @IsNotEmpty()
  puzzleId!: string;

  @ApiProperty({ example: 3, description: 'Monotonically increasing event sequence number within the session (starts at 1)', minimum: 1 })
  @IsInt()
  @Min(1)
  sequence!: number;

  @ApiProperty({
    enum: ReplayEventType,
    example: ReplayEventType.HINT_REVEALED,
    description: 'Type of replay event',
  })
  @IsEnum(ReplayEventType)
  eventType!: ReplayEventType;

  @ApiPropertyOptional({
    example: { hintIndex: 1 },
    description: 'Arbitrary JSON payload with event-specific data',
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
