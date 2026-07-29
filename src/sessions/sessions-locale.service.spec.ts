import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { Session, SessionStatus } from './entities/session.entity';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

describe('SessionsService — locale on session creation', () => {
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

  it('stores the provided locale on the session', async () => {
    const created = { userId: 'u1', puzzleId: 'p1', status: SessionStatus.ACTIVE, locale: 'es' };
    const saved = { id: 's1', ...created, startedAt: new Date(), hintsUsed: 0, score: 0, completedAt: null };
    mockRepo.create.mockReturnValue(created);
    mockRepo.save.mockResolvedValue(saved);

    const result = await service.start('u1', { puzzleId: 'p1' }, 'es');

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'es' }),
    );
    expect(result.locale).toBe('es');
  });

  it('defaults locale to "en" when none is provided', async () => {
    const created = { userId: 'u1', puzzleId: 'p1', status: SessionStatus.ACTIVE, locale: 'en' };
    const saved = { id: 's1', ...created, startedAt: new Date(), hintsUsed: 0, score: 0, completedAt: null };
    mockRepo.create.mockReturnValue(created);
    mockRepo.save.mockResolvedValue(saved);

    const result = await service.start('u1', { puzzleId: 'p1' });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en' }),
    );
    expect(result.locale).toBe('en');
  });

  it('uses locale from dto when explicit locale arg is not given', async () => {
    const created = { userId: 'u1', puzzleId: 'p1', status: SessionStatus.ACTIVE, locale: 'fr' };
    const saved = { id: 's1', ...created, startedAt: new Date(), hintsUsed: 0, score: 0, completedAt: null };
    mockRepo.create.mockReturnValue(created);
    mockRepo.save.mockResolvedValue(saved);

    const result = await service.start('u1', { puzzleId: 'p1', locale: 'fr' });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'fr' }),
    );
    expect(result.locale).toBe('fr');
  });

  it('explicit locale arg takes precedence over dto.locale', async () => {
    const created = { userId: 'u1', puzzleId: 'p1', status: SessionStatus.ACTIVE, locale: 'de' };
    const saved = { id: 's1', ...created, startedAt: new Date(), hintsUsed: 0, score: 0, completedAt: null };
    mockRepo.create.mockReturnValue(created);
    mockRepo.save.mockResolvedValue(saved);

    // Explicit 'de' wins over dto.locale 'es'
    await service.start('u1', { puzzleId: 'p1', locale: 'es' }, 'de');

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'de' }),
    );
  });
});
