import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RecommendationsService } from './recommendations.service';
import { Puzzle } from '../puzzles/entities/puzzle.entity';
import { Session, SessionStatus } from '../sessions/entities/session.entity';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let cacheManager: any;
  let puzzleRepo: any;
  let sessionRepo: any;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    puzzleRepo = {
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    sessionRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: getRepositoryToken(Puzzle), useValue: puzzleRepo },
        { provide: getRepositoryToken(Session), useValue: sessionRepo },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRecommendations', () => {
    it('should return cached recommendations if available', async () => {
      const mockPuzzles = [{ id: 'puz1', title: 'Test Puzzle' }];
      cacheManager.get.mockResolvedValue(mockPuzzles);

      const result = await service.getRecommendations('user1');
      
      expect(cacheManager.get).toHaveBeenCalledWith('recommendations_user1_standard');
      expect(result).toEqual(mockPuzzles);
      expect(sessionRepo.find).not.toHaveBeenCalled();
    });

    it('should handle cold-start users', async () => {
      cacheManager.get.mockResolvedValue(null);
      sessionRepo.find.mockResolvedValue([]);
      
      const mockEasyPuzzles = [{ id: 'easy1', difficulty: 'easy' }];
      puzzleRepo.find.mockResolvedValue(mockEasyPuzzles);

      const result = await service.getRecommendations('user-cold');
      
      expect(puzzleRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { difficulty: 'easy' },
        take: 5,
      }));
      expect(result).toEqual(mockEasyPuzzles);
      expect(cacheManager.set).toHaveBeenCalledWith('recommendations_user-cold_standard', mockEasyPuzzles);
    });

    it('should fetch personalized recommendations for experienced users', async () => {
      cacheManager.get.mockResolvedValue(null);
      
      const mockSessions = [
        { puzzleId: 'puz1', status: SessionStatus.COMPLETED },
        { puzzleId: 'puz2', status: SessionStatus.ACTIVE },
      ];
      sessionRepo.find.mockResolvedValue(mockSessions);

      const mockCompletedPuzzles = [
        { id: 'puz1', difficulty: 'medium', category: { id: 'cat1' } },
      ];
      puzzleRepo.find.mockResolvedValue(mockCompletedPuzzles);

      const mockRecommended = [{ id: 'puz3', difficulty: 'medium' }];
      puzzleRepo.createQueryBuilder().getMany.mockResolvedValue(mockRecommended);

      const result = await service.getRecommendations('user-exp');
      
      expect(puzzleRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: expect.anything() },
        relations: ['category']
      }));
      
      const qb = puzzleRepo.createQueryBuilder();
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('puzzle.category', 'category');
      expect(qb.where).toHaveBeenCalledWith('puzzle.id NOT IN (:...excludedIds)', { excludedIds: ['puz1', 'puz2'] });
      expect(result).toEqual(mockRecommended);
    });

    it('should return a challenge puzzle when mode is challenge', async () => {
      cacheManager.get.mockResolvedValue(null);
      
      const mockSessions = [
        { puzzleId: 'puz1', status: SessionStatus.COMPLETED },
      ];
      sessionRepo.find.mockResolvedValue(mockSessions);

      // User's most successful difficulty is medium
      const mockCompletedPuzzles = [
        { id: 'puz1', difficulty: 'medium' },
      ];
      puzzleRepo.find.mockResolvedValue(mockCompletedPuzzles);

      const mockChallengePuzzles = [{ id: 'puz2', difficulty: 'hard' }];
      // When puzzleRepo.find is called for the challenge query, it should return mockChallengePuzzles
      // Note: puzzleRepo.find is also called to get completed puzzles.
      puzzleRepo.find.mockImplementation((options: any) => {
        if (options.where && typeof options.where.difficulty === 'string') {
          return Promise.resolve(mockChallengePuzzles);
        }
        return Promise.resolve(mockCompletedPuzzles);
      });

      const result = await service.getRecommendations('user-challenge', 'challenge');
      
      expect(puzzleRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ difficulty: 'hard' }),
        take: 1,
      }));
      expect(result).toEqual(mockChallengePuzzles);
      expect(cacheManager.set).toHaveBeenCalledWith('recommendations_user-challenge_challenge', mockChallengePuzzles);
    });
  });
});
