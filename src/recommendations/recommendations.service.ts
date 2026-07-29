import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Puzzle } from '../puzzles/entities/puzzle.entity';
import { Session, SessionStatus } from '../sessions/entities/session.entity';
import { Category } from '../categories/entities/category.entity';

@Injectable()
export class RecommendationsService {
  private readonly DIFFICULTY_TIERS = ['easy', 'medium', 'hard'];

  constructor(
    @InjectRepository(Puzzle)
    private readonly puzzleRepo: Repository<Puzzle>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getRecommendations(userId: string, mode?: string): Promise<Puzzle[]> {
    const cacheKey = `recommendations_${userId}_${mode || 'standard'}`;
    const cached = await this.cacheManager.get<Puzzle[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const sessions = await this.sessionRepo.find({
      where: { userId },
      order: { startedAt: 'DESC' },
    });

    const excludedIds = sessions.map(s => s.puzzleId);
    let recommendedPuzzles: Puzzle[] = [];

    // Cold-start logic
    if (sessions.length === 0) {
      recommendedPuzzles = await this.puzzleRepo.find({
        where: { difficulty: 'easy' },
        take: 5,
      });
    } else {
      // Personalization logic
      const completedSessions = sessions.filter(s => s.status === SessionStatus.COMPLETED);
      
      if (completedSessions.length === 0) {
        // Fallback if they have sessions but none completed
        recommendedPuzzles = await this.puzzleRepo.find({
          where: { difficulty: 'easy', id: excludedIds.length > 0 ? Not(In(excludedIds)) : undefined },
          take: 5,
        });
      } else {
        // Find most played category and most successful difficulty
        const categoryCounts: Record<string, number> = {};
        const difficultyCounts: Record<string, number> = {};
        
        // Need to load puzzles for completed sessions to see categories/difficulties
        const completedPuzzleIds = completedSessions.map(s => s.puzzleId);
        const completedPuzzles = await this.puzzleRepo.find({
          where: { id: In(completedPuzzleIds) },
          relations: ['category']
        });

        for (const puzzle of completedPuzzles) {
          if (puzzle.category?.id) {
            categoryCounts[puzzle.category.id] = (categoryCounts[puzzle.category.id] || 0) + 1;
          }
          if (puzzle.difficulty) {
            difficultyCounts[puzzle.difficulty] = (difficultyCounts[puzzle.difficulty] || 0) + 1;
          }
        }

        let preferredCategoryId = '';
        let maxCatCount = 0;
        for (const [catId, count] of Object.entries(categoryCounts)) {
          if (count > maxCatCount) {
            maxCatCount = count;
            preferredCategoryId = catId;
          }
        }

        let preferredDifficulty = 'easy';
        let maxDiffCount = 0;
        for (const [diff, count] of Object.entries(difficultyCounts)) {
          if (count > maxDiffCount) {
            maxDiffCount = count;
            preferredDifficulty = diff;
          }
        }

        if (mode === 'challenge') {
          const currentTierIndex = this.DIFFICULTY_TIERS.indexOf(preferredDifficulty);
          const challengeTierIndex = Math.min(currentTierIndex + 1, this.DIFFICULTY_TIERS.length - 1);
          const challengeDifficulty = this.DIFFICULTY_TIERS[challengeTierIndex];

          recommendedPuzzles = await this.puzzleRepo.find({
            where: {
              difficulty: challengeDifficulty,
              id: excludedIds.length > 0 ? Not(In(excludedIds)) : undefined,
            },
            take: 1, // Suggest one challenge puzzle
          });
        } else {
          // Standard recommendation
          const query = this.puzzleRepo.createQueryBuilder('puzzle')
            .leftJoinAndSelect('puzzle.category', 'category')
            .where('puzzle.id NOT IN (:...excludedIds)', { excludedIds: excludedIds.length > 0 ? excludedIds : ['00000000-0000-0000-0000-000000000000'] });

          if (preferredCategoryId) {
            query.orderBy(`CASE WHEN puzzle.categoryId = '${preferredCategoryId}' THEN 1 ELSE 0 END`, 'DESC');
          }
          if (preferredDifficulty) {
            query.addOrderBy(`CASE WHEN puzzle.difficulty = '${preferredDifficulty}' THEN 1 ELSE 0 END`, 'DESC');
          }

          query.take(5);
          recommendedPuzzles = await query.getMany();
        }
      }
    }

    await this.cacheManager.set(cacheKey, recommendedPuzzles);
    return recommendedPuzzles;
  }
}
