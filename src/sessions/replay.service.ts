import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionStatus } from './entities/session.entity';
import { SessionReplayEvent, ReplayEventType } from './entities/session-replay-event.entity';
import { RecordReplayEventDto } from './dto/record-replay-event.dto';

export interface ReplayResponse {
  sessionId: string;
  userId: string;
  puzzleId: string;
  totalEvents: number;
  events: SessionReplayEvent[];
}

@Injectable()
export class ReplayService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,

    @InjectRepository(SessionReplayEvent)
    private readonly replayEventRepo: Repository<SessionReplayEvent>,
  ) {}

  /**
   * Record a single replay event for a session.
   * Events may be recorded for any session status; caller is responsible
   * for setting the appropriate event type.
   */
  async recordEvent(dto: RecordReplayEventDto): Promise<SessionReplayEvent> {
    const session = await this.sessionRepo.findOne({ where: { id: dto.sessionId } });
    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    const event = this.replayEventRepo.create({
      sessionId: dto.sessionId,
      userId: dto.userId,
      puzzleId: dto.puzzleId,
      sequence: dto.sequence,
      eventType: dto.eventType,
      payload: dto.payload ?? null,
    });

    return this.replayEventRepo.save(event);
  }

  /**
   * Retrieve the full replay for a completed session.
   * Only the session owner can view their replay.
   * Only sessions with COMPLETED status can be replayed.
   */
  async getReplay(userId: string, sessionId: string): Promise<ReplayResponse> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException(
        'Replay is only available for completed sessions',
      );
    }

    const events = await this.replayEventRepo.find({
      where: { sessionId },
      order: { sequence: 'ASC' },
    });

    return {
      sessionId: session.id,
      userId: session.userId,
      puzzleId: session.puzzleId,
      totalEvents: events.length,
      events,
    };
  }

  /**
   * List all completed sessions for a user that have at least one replay event.
   */
  async listReplays(userId: string): Promise<Session[]> {
    return this.sessionRepo
      .createQueryBuilder('session')
      .innerJoin(
        'session_replay_events',
        'replay',
        'replay.sessionId = session.id',
      )
      .where('session.userId = :userId', { userId })
      .andWhere('session.status = :status', { status: SessionStatus.COMPLETED })
      .distinct(true)
      .orderBy('session.completedAt', 'DESC')
      .getMany();
  }

  /**
   * Helper to record the initial SESSION_STARTED event.
   * Called by SessionsService when a new session begins.
   */
  async recordSessionStarted(
    session: Session,
  ): Promise<SessionReplayEvent> {
    return this.recordEvent({
      sessionId: session.id,
      userId: session.userId,
      puzzleId: session.puzzleId,
      sequence: 1,
      eventType: ReplayEventType.SESSION_STARTED,
      payload: { startedAt: session.startedAt },
    });
  }

  /**
   * Helper to record a SESSION_COMPLETED event.
   * Called by SessionsService when a session is successfully submitted.
   */
  async recordSessionCompleted(
    session: Session,
  ): Promise<SessionReplayEvent> {
    const lastEvent = await this.replayEventRepo.findOne({
      where: { sessionId: session.id },
      order: { sequence: 'DESC' },
    });
    const sequence = lastEvent ? lastEvent.sequence + 1 : 2;

    return this.recordEvent({
      sessionId: session.id,
      userId: session.userId,
      puzzleId: session.puzzleId,
      sequence,
      eventType: ReplayEventType.SESSION_COMPLETED,
      payload: {
        score: session.score,
        hintsUsed: session.hintsUsed,
        completedAt: session.completedAt,
      },
    });
  }

  /**
   * Helper to record a HINT_REVEALED event.
   */
  async recordHintRevealed(
    session: Session,
    hintOrder: number,
    hintId: string,
  ): Promise<SessionReplayEvent> {
    const lastEvent = await this.replayEventRepo.findOne({
      where: { sessionId: session.id },
      order: { sequence: 'DESC' },
    });
    const sequence = lastEvent ? lastEvent.sequence + 1 : 2;

    return this.recordEvent({
      sessionId: session.id,
      userId: session.userId,
      puzzleId: session.puzzleId,
      sequence,
      eventType: ReplayEventType.HINT_REVEALED,
      payload: { hintOrder, hintId },
    });
  }
}
