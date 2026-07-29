import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { Session, SessionStatus } from './entities/session.entity';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: getRepositoryToken(Session), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    jest.clearAllMocks();
  });

  describe('start', () => {
    it('creates and saves a new active session', async () => {
      const created = { userId: 'u1', puzzleId: 'p1', status: SessionStatus.ACTIVE };
      const saved = { id: 's1', ...created, startedAt: new Date(), hintsUsed: 0, score: 0, completedAt: null };
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.start('u1', { puzzleId: 'p1' });

      expect(mockRepo.create).toHaveBeenCalledWith({
        userId: 'u1',
        puzzleId: 'p1',
        status: SessionStatus.ACTIVE,
        locale: 'en',
      });
      expect(mockRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(saved);
    });
  });

  describe('submit', () => {
    it('marks session completed and computes score on valid solution', async () => {
      const session: Partial<Session> = {
        id: 's1',
        userId: 'u1',
        status: SessionStatus.ACTIVE,
        startedAt: new Date(Date.now() - 60_000),
        hintsUsed: 0,
        score: 0,
        completedAt: null,
      };
      mockRepo.findOne.mockResolvedValue(session);
      mockRepo.save.mockImplementation((s) => Promise.resolve(s));

      const result = await service.submit('u1', 's1', { solution: 'correct', hintsUsed: 1 });

      expect(result.status).toBe(SessionStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.hintsUsed).toBe(1);
    });

    it('throws BadRequestException when session is already completed', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        status: SessionStatus.COMPLETED,
      });

      await expect(
        service.submit('u1', 's1', { solution: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when session does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.submit('u1', 'missing', { solution: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user does not own session', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 's1', userId: 'other', status: SessionStatus.ACTIVE });

      await expect(service.submit('u1', 's1', { solution: 'x' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('abandon', () => {
    it('marks session abandoned', async () => {
      const session: Partial<Session> = {
        id: 's1',
        userId: 'u1',
        status: SessionStatus.ACTIVE,
      };
      mockRepo.findOne.mockResolvedValue(session);
      mockRepo.save.mockImplementation((s) => Promise.resolve(s));

      const result = await service.abandon('u1', 's1');

      expect(result.status).toBe(SessionStatus.ABANDONED);
      expect(result.completedAt).toBeDefined();
    });

    it('throws BadRequestException when session is not active', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        status: SessionStatus.ABANDONED,
      });

      await expect(service.abandon('u1', 's1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getById', () => {
    it('returns session for owning user', async () => {
      const session = { id: 's1', userId: 'u1', status: SessionStatus.ACTIVE };
      mockRepo.findOne.mockResolvedValue(session);

      const result = await service.getById('u1', 's1');
      expect(result).toEqual(session);
    });

    it('throws ForbiddenException when user does not own session', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 's1', userId: 'other' });
      await expect(service.getById('u1', 's1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when session does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.getById('u1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('autoAbandonStaleSessions', () => {
    it('abandons stale active sessions and returns count', async () => {
      const stale: Partial<Session>[] = [
        { id: 's1', userId: 'u1', status: SessionStatus.ACTIVE },
        { id: 's2', userId: 'u2', status: SessionStatus.ACTIVE },
      ];
      mockRepo.find.mockResolvedValue(stale);
      mockRepo.save.mockImplementation((sessions) => Promise.resolve(sessions));

      const count = await service.autoAbandonStaleSessions();

      expect(count).toBe(2);
      expect(stale[0].status).toBe(SessionStatus.ABANDONED);
      expect(stale[1].status).toBe(SessionStatus.ABANDONED);
      expect(mockRepo.save).toHaveBeenCalledWith(stale);
    });

    it('returns 0 when no stale sessions exist', async () => {
      mockRepo.find.mockResolvedValue([]);

      const count = await service.autoAbandonStaleSessions();
      expect(count).toBe(0);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });
});
