import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HintsService } from './hints.service';
import { SessionsService } from '../sessions/sessions.service';
import { Session } from '../sessions/entities/session.entity';
import { ScoringService } from '../scoring/scoring.service';
import { Score } from '../scoring/entities/score.entity';
import { EventBusService } from '../common/events/event-bus.service';
import { BadRequestException } from '@nestjs/common';

// Minimal no-op repository mock for SessionsService's DB dependency.
// The hints tests exercise only the in-memory helpers on SessionsService
// (createSession / getSession / updateSessionStatus).
const mockSessionRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockScoreRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockEventBus = { emit: jest.fn() };

describe('HintsService', () => {
  let service: HintsService;
  let sessionsService: SessionsService;
  let scoringService: ScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HintsService,
        SessionsService,
        { provide: getRepositoryToken(Session), useValue: mockSessionRepo },
        ScoringService,
        { provide: getRepositoryToken(Score), useValue: mockScoreRepo },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<HintsService>(HintsService);
    sessionsService = module.get<SessionsService>(SessionsService);
    scoringService = module.get<ScoringService>(ScoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('revealNextHint', () => {
    const sessionId = 'test-session';
    const puzzleId = 'puzzle-1';

    beforeEach(() => {
      sessionsService.createSession(sessionId, puzzleId);
    });

    it('should deliver hints in order (1 -> 2 -> 3) (ordered reveal)', () => {
      // Reveal 1
      const hint1 = service.revealNextHint(sessionId);
      expect(hint1.order).toBe(1);
      expect(hint1.puzzleId).toBe(puzzleId);

      // Reveal 2
      const hint2 = service.revealNextHint(sessionId);
      expect(hint2.order).toBe(2);

      // Reveal 3
      const hint3 = service.revealNextHint(sessionId);
      expect(hint3.order).toBe(3);
    });

    it('should prevent repeated hints and throw 400 when all are revealed (repeat prevention)', () => {
      // Reveal all 3 hints
      service.revealNextHint(sessionId);
      service.revealNextHint(sessionId);
      service.revealNextHint(sessionId);

      // 4th reveal attempt should fail with BadRequestException (400)
      expect(() => service.revealNextHint(sessionId)).toThrow(BadRequestException);
    });

    it('should trigger score penalty via the scoring module (penalty trigger)', () => {
      // Starting score is 100
      expect(scoringService.getScore(sessionId)).toBe(100);

      // Reveal 1
      service.revealNextHint(sessionId);
      expect(scoringService.getScore(sessionId)).toBe(90); // 100 - 10

      // Reveal 2
      service.revealNextHint(sessionId);
      expect(scoringService.getScore(sessionId)).toBe(80); // 90 - 10
    });

    it('should throw 400 for completed session (invalid session states)', () => {
      sessionsService.updateSessionStatus(sessionId, 'COMPLETED');
      expect(() => service.revealNextHint(sessionId)).toThrow(BadRequestException);
    });

    it('should throw 400 for abandoned session (invalid session states)', () => {
      sessionsService.updateSessionStatus(sessionId, 'ABANDONED');
      expect(() => service.revealNextHint(sessionId)).toThrow(BadRequestException);
    });
  });

  describe('getHintsForPuzzle', () => {
    it('should return all hints for a puzzle sorted by order (admin endpoint)', () => {
      const hints = service.getHintsForPuzzle('puzzle-1');
      expect(hints.length).toBe(3);
      expect(hints[0].order).toBe(1);
      expect(hints[1].order).toBe(2);
      expect(hints[2].order).toBe(3);
    });
  });
});
