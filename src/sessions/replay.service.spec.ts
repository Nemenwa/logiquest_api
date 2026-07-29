import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReplayService } from './replay.service';
import { Session, SessionStatus } from './entities/session.entity';
import { SessionReplayEvent, ReplayEventType } from './entities/session-replay-event.entity';
import { RecordReplayEventDto } from './dto/record-replay-event.dto';

// ---------------------------------------------------------------------------
// Mock repositories
// ---------------------------------------------------------------------------
const mockSessionRepo = {
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockReplayEventRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    userId: 'user-1',
    puzzleId: 'puzzle-1',
    status: SessionStatus.COMPLETED,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: new Date('2024-01-01T10:15:00Z'),
    score: 800,
    hintsUsed: 1,
    ...overrides,
  } as Session;
}

function makeEvent(overrides: Partial<SessionReplayEvent> = {}): SessionReplayEvent {
  return {
    id: 'event-1',
    sessionId: 'session-1',
    userId: 'user-1',
    puzzleId: 'puzzle-1',
    sequence: 1,
    eventType: ReplayEventType.SESSION_STARTED,
    payload: null,
    occurredAt: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  } as SessionReplayEvent;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ReplayService', () => {
  let service: ReplayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReplayService,
        { provide: getRepositoryToken(Session), useValue: mockSessionRepo },
        { provide: getRepositoryToken(SessionReplayEvent), useValue: mockReplayEventRepo },
      ],
    }).compile();

    service = module.get<ReplayService>(ReplayService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // recordEvent
  // -------------------------------------------------------------------------
  describe('recordEvent', () => {
    it('creates and saves a replay event for an existing session', async () => {
      const session = makeSession();
      const dto: RecordReplayEventDto = {
        sessionId: 'session-1',
        userId: 'user-1',
        puzzleId: 'puzzle-1',
        sequence: 1,
        eventType: ReplayEventType.SESSION_STARTED,
        payload: { startedAt: session.startedAt },
      };
      const created = makeEvent(dto);

      mockSessionRepo.findOne.mockResolvedValue(session);
      mockReplayEventRepo.create.mockReturnValue(created);
      mockReplayEventRepo.save.mockResolvedValue(created);

      const result = await service.recordEvent(dto);

      expect(mockSessionRepo.findOne).toHaveBeenCalledWith({ where: { id: dto.sessionId } });
      expect(mockReplayEventRepo.create).toHaveBeenCalledWith({
        sessionId: dto.sessionId,
        userId: dto.userId,
        puzzleId: dto.puzzleId,
        sequence: dto.sequence,
        eventType: dto.eventType,
        payload: dto.payload,
      });
      expect(mockReplayEventRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('throws NotFoundException when session does not exist', async () => {
      mockSessionRepo.findOne.mockResolvedValue(null);

      const dto: RecordReplayEventDto = {
        sessionId: 'nonexistent',
        userId: 'user-1',
        puzzleId: 'puzzle-1',
        sequence: 1,
        eventType: ReplayEventType.SESSION_STARTED,
      };

      await expect(service.recordEvent(dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('stores null payload when payload is undefined', async () => {
      const session = makeSession();
      const dto: RecordReplayEventDto = {
        sessionId: 'session-1',
        userId: 'user-1',
        puzzleId: 'puzzle-1',
        sequence: 2,
        eventType: ReplayEventType.HINT_REVEALED,
      };

      mockSessionRepo.findOne.mockResolvedValue(session);
      mockReplayEventRepo.create.mockReturnValue({ ...dto, payload: null });
      mockReplayEventRepo.save.mockImplementation((e) => Promise.resolve(e));

      await service.recordEvent(dto);

      expect(mockReplayEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ payload: null }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // getReplay
  // -------------------------------------------------------------------------
  describe('getReplay', () => {
    it('returns full replay for the session owner', async () => {
      const session = makeSession();
      const events = [
        makeEvent({ sequence: 1, eventType: ReplayEventType.SESSION_STARTED }),
        makeEvent({ id: 'event-2', sequence: 2, eventType: ReplayEventType.SESSION_COMPLETED }),
      ];

      mockSessionRepo.findOne.mockResolvedValue(session);
      mockReplayEventRepo.find.mockResolvedValue(events);

      const result = await service.getReplay('user-1', 'session-1');

      expect(result.sessionId).toBe('session-1');
      expect(result.userId).toBe('user-1');
      expect(result.puzzleId).toBe('puzzle-1');
      expect(result.totalEvents).toBe(2);
      expect(result.events).toEqual(events);
      expect(mockReplayEventRepo.find).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        order: { sequence: 'ASC' },
      });
    });

    it('throws NotFoundException when session does not exist', async () => {
      mockSessionRepo.findOne.mockResolvedValue(null);

      await expect(service.getReplay('user-1', 'nonexistent')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user does not own the session', async () => {
      const session = makeSession({ userId: 'other-user' });
      mockSessionRepo.findOne.mockResolvedValue(session);

      await expect(service.getReplay('user-1', 'session-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when session is not completed (ACTIVE)', async () => {
      const session = makeSession({ status: SessionStatus.ACTIVE });
      mockSessionRepo.findOne.mockResolvedValue(session);

      await expect(service.getReplay('user-1', 'session-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws BadRequestException when session is ABANDONED', async () => {
      const session = makeSession({ status: SessionStatus.ABANDONED });
      mockSessionRepo.findOne.mockResolvedValue(session);

      await expect(service.getReplay('user-1', 'session-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('returns an empty events array when no events are recorded', async () => {
      const session = makeSession();
      mockSessionRepo.findOne.mockResolvedValue(session);
      mockReplayEventRepo.find.mockResolvedValue([]);

      const result = await service.getReplay('user-1', 'session-1');

      expect(result.totalEvents).toBe(0);
      expect(result.events).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // listReplays
  // -------------------------------------------------------------------------
  describe('listReplays', () => {
    it('returns completed sessions with replay data for the user', async () => {
      const sessions = [
        makeSession({ id: 'session-1', completedAt: new Date('2024-01-02T10:00:00Z') }),
        makeSession({ id: 'session-2', completedAt: new Date('2024-01-01T10:00:00Z') }),
      ];

      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(sessions),
      };

      mockSessionRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.listReplays('user-1');

      expect(result).toEqual(sessions);
      expect(qb.where).toHaveBeenCalledWith('session.userId = :userId', { userId: 'user-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('session.status = :status', {
        status: SessionStatus.COMPLETED,
      });
    });

    it('returns empty array when no replayable sessions exist', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockSessionRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.listReplays('user-1');

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // recordSessionStarted
  // -------------------------------------------------------------------------
  describe('recordSessionStarted', () => {
    it('records a SESSION_STARTED event with sequence 1', async () => {
      const session = makeSession({ status: SessionStatus.ACTIVE });
      const savedEvent = makeEvent({
        eventType: ReplayEventType.SESSION_STARTED,
        sequence: 1,
        payload: { startedAt: session.startedAt },
      });

      mockSessionRepo.findOne.mockResolvedValue(session);
      mockReplayEventRepo.create.mockReturnValue(savedEvent);
      mockReplayEventRepo.save.mockResolvedValue(savedEvent);

      const result = await service.recordSessionStarted(session);

      expect(result.eventType).toBe(ReplayEventType.SESSION_STARTED);
      expect(result.sequence).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // recordSessionCompleted
  // -------------------------------------------------------------------------
  describe('recordSessionCompleted', () => {
    it('records SESSION_COMPLETED event after the last existing event', async () => {
      const session = makeSession();
      const lastEvent = makeEvent({ sequence: 2 });
      const completedEvent = makeEvent({
        id: 'event-3',
        sequence: 3,
        eventType: ReplayEventType.SESSION_COMPLETED,
        payload: {
          score: session.score,
          hintsUsed: session.hintsUsed,
          completedAt: session.completedAt,
        },
      });

      mockSessionRepo.findOne.mockResolvedValue(session);
      mockReplayEventRepo.findOne.mockResolvedValue(lastEvent);
      mockReplayEventRepo.create.mockReturnValue(completedEvent);
      mockReplayEventRepo.save.mockResolvedValue(completedEvent);

      const result = await service.recordSessionCompleted(session);

      expect(result.eventType).toBe(ReplayEventType.SESSION_COMPLETED);
      expect(result.sequence).toBe(3);
      expect(result.payload).toMatchObject({
        score: session.score,
        hintsUsed: session.hintsUsed,
      });
    });

    it('uses sequence 2 when no prior events exist', async () => {
      const session = makeSession();
      const completedEvent = makeEvent({
        sequence: 2,
        eventType: ReplayEventType.SESSION_COMPLETED,
      });

      mockSessionRepo.findOne.mockResolvedValue(session);
      mockReplayEventRepo.findOne.mockResolvedValue(null); // no prior events
      mockReplayEventRepo.create.mockReturnValue(completedEvent);
      mockReplayEventRepo.save.mockResolvedValue(completedEvent);

      const result = await service.recordSessionCompleted(session);

      expect(result.sequence).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // recordHintRevealed
  // -------------------------------------------------------------------------
  describe('recordHintRevealed', () => {
    it('records a HINT_REVEALED event with correct payload', async () => {
      const session = makeSession({ status: SessionStatus.ACTIVE });
      const lastEvent = makeEvent({ sequence: 1 });
      const hintEvent = makeEvent({
        id: 'event-2',
        sequence: 2,
        eventType: ReplayEventType.HINT_REVEALED,
        payload: { hintOrder: 1, hintId: 'hint-1' },
      });

      mockSessionRepo.findOne.mockResolvedValue(session);
      mockReplayEventRepo.findOne.mockResolvedValue(lastEvent);
      mockReplayEventRepo.create.mockReturnValue(hintEvent);
      mockReplayEventRepo.save.mockResolvedValue(hintEvent);

      const result = await service.recordHintRevealed(session, 1, 'hint-1');

      expect(result.eventType).toBe(ReplayEventType.HINT_REVEALED);
      expect(result.payload).toMatchObject({ hintOrder: 1, hintId: 'hint-1' });
    });
  });
});
