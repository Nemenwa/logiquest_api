import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PuzzlesService } from './puzzles.service';
import { Puzzle } from './entities/puzzle.entity';
import { PuzzleTranslation } from './entities/puzzle-translation.entity';
import { Category } from '../categories/entities/category.entity';
import { Tag } from '../tags/entities/tag.entity';

// ── Minimal mock fixtures ─────────────────────────────────────────────────────

const basePuzzle: Partial<Puzzle> = {
  id: 'puzzle-1',
  title: 'English Title',
  description: 'English description',
  difficulty: 'medium',
  authorId: 'admin-1',
  createdAt: new Date('2024-01-01'),
  category: null,
  conditions: null,
  effects: null,
};

const esTrans: Partial<PuzzleTranslation> = {
  id: 'trans-1',
  puzzleId: 'puzzle-1',
  locale: 'es',
  title: 'Título en español',
  description: 'Descripción en español',
  hints: [{ order: 1, content: 'Pista 1' }],
  createdAt: new Date('2024-06-01'),
  updatedAt: new Date('2024-06-01'),
};

// ── Repository mocks ──────────────────────────────────────────────────────────

const mockPuzzleRepo = {
  create: jest.fn().mockImplementation((d) => d),
  save: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockCategoryRepo = {
  findOne: jest.fn(),
};

const mockTranslationRepo = {
  create: jest.fn().mockImplementation((d) => d),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe('PuzzlesService — i18n / translations', () => {
  let service: PuzzlesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PuzzlesService,
        { provide: getRepositoryToken(Puzzle), useValue: mockPuzzleRepo },
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepo },
        { provide: getRepositoryToken(PuzzleTranslation), useValue: mockTranslationRepo },
        { provide: getRepositoryToken(Tag), useValue: {} },
      ],
    }).compile();

    service = module.get<PuzzlesService>(PuzzlesService);
    jest.clearAllMocks();
  });

  // ── findOneLocalised ────────────────────────────────────────────────────────

  describe('findOneLocalised', () => {
    it('returns base puzzle content when locale is "en"', async () => {
      mockPuzzleRepo.findOne.mockResolvedValue(basePuzzle);

      const result = await service.findOneLocalised('puzzle-1', 'en');

      expect(result.title).toBe('English Title');
      expect(result.description).toBe('English description');
      expect(result.locale).toBe('en');
      // No translation lookup for the base locale.
      expect(mockTranslationRepo.findOne).not.toHaveBeenCalled();
    });

    it('returns translated content when a matching translation exists', async () => {
      mockPuzzleRepo.findOne.mockResolvedValue(basePuzzle);
      mockTranslationRepo.findOne.mockResolvedValue(esTrans);

      const result = await service.findOneLocalised('puzzle-1', 'es');

      expect(result.title).toBe('Título en español');
      expect(result.description).toBe('Descripción en español');
      expect(result.hints).toEqual([{ order: 1, content: 'Pista 1' }]);
      expect(result.locale).toBe('es');
    });

    it('falls back to English/base content when no translation exists for locale', async () => {
      mockPuzzleRepo.findOne.mockResolvedValue(basePuzzle);
      mockTranslationRepo.findOne.mockResolvedValue(null);

      const result = await service.findOneLocalised('puzzle-1', 'fr');

      // Falls back — English base content returned, no error.
      expect(result.title).toBe('English Title');
      expect(result.locale).toBe('en');
    });

    it('throws NotFoundException when the puzzle itself does not exist', async () => {
      mockPuzzleRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneLocalised('missing', 'es')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ── upsertTranslation ───────────────────────────────────────────────────────

  describe('upsertTranslation', () => {
    const validDto = {
      locale: 'es',
      title: 'Título',
      description: 'Descripción',
      hints: [{ order: 1, content: 'Pista 1' }],
    };

    it('creates a new translation when none exists for (puzzleId, locale)', async () => {
      mockPuzzleRepo.findOne.mockResolvedValue(basePuzzle);
      mockTranslationRepo.findOne.mockResolvedValue(null);
      const saved = { ...esTrans };
      mockTranslationRepo.save.mockResolvedValue(saved);

      const result = await service.upsertTranslation('puzzle-1', validDto);

      expect(mockTranslationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ puzzleId: 'puzzle-1', locale: 'es' }),
      );
      expect(mockTranslationRepo.save).toHaveBeenCalled();
      expect(result.locale).toBe('es');
    });

    it('updates an existing translation instead of creating a duplicate', async () => {
      mockPuzzleRepo.findOne.mockResolvedValue(basePuzzle);
      const existing = { ...esTrans, title: 'Old title' };
      mockTranslationRepo.findOne.mockResolvedValue(existing);
      mockTranslationRepo.save.mockImplementation((t) => Promise.resolve(t));

      const result = await service.upsertTranslation('puzzle-1', {
        ...validDto,
        title: 'Updated title',
      });

      // create should NOT be called — it's an update path.
      expect(mockTranslationRepo.create).not.toHaveBeenCalled();
      expect(result.title).toBe('Updated title');
    });

    it('throws BadRequestException for an unsupported locale', async () => {
      mockPuzzleRepo.findOne.mockResolvedValue(basePuzzle);

      await expect(
        service.upsertTranslation('puzzle-1', { ...validDto, locale: 'xx' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when the puzzle does not exist', async () => {
      mockPuzzleRepo.findOne.mockResolvedValue(null);

      await expect(service.upsertTranslation('missing', validDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ── findAllTranslations ─────────────────────────────────────────────────────

  describe('findAllTranslations', () => {
    it('returns all translations for a puzzle', async () => {
      mockPuzzleRepo.findOne.mockResolvedValue(basePuzzle);
      mockTranslationRepo.find.mockResolvedValue([esTrans]);

      const result = await service.findAllTranslations('puzzle-1');

      expect(result).toHaveLength(1);
      expect(result[0].locale).toBe('es');
    });

    it('returns an empty array when no translations exist', async () => {
      mockPuzzleRepo.findOne.mockResolvedValue(basePuzzle);
      mockTranslationRepo.find.mockResolvedValue([]);

      const result = await service.findAllTranslations('puzzle-1');

      expect(result).toEqual([]);
    });

    it('throws NotFoundException when the puzzle does not exist', async () => {
      mockPuzzleRepo.findOne.mockResolvedValue(null);

      await expect(service.findAllTranslations('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
