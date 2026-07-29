import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PuzzlesService } from './puzzles.service';
import { Puzzle } from './entities/puzzle.entity';
import { PuzzleTranslation } from './entities/puzzle-translation.entity';
import { Category } from '../categories/entities/category.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Role } from '../common/enums/role.enum';

describe('PuzzlesService', () => {
  let service: PuzzlesService;

  const mockPuzzleRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((puz) => Promise.resolve({ id: 'puz-uuid', ...puz, createdAt: new Date() })),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCategoryRepository = {
    findOne: jest.fn(),
  };

  const mockTagRepository = {
    find: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PuzzlesService,
        {
          provide: getRepositoryToken(Puzzle),
          useValue: mockPuzzleRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
  provide: getRepositoryToken(PuzzleTranslation),
  useValue: {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  },
},
{
  provide: getRepositoryToken(Tag),
  useValue: mockTagRepository,
},
      ],
    }).compile();

    service = module.get<PuzzlesService>(PuzzlesService);
    jest.clearAllMocks();
    mockPuzzleRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a puzzle with valid category and author', async () => {
      const category = { id: 'cat-1', name: 'Logic' };
      mockCategoryRepository.findOne.mockResolvedValue(category);

      const dto = {
        title: 'Light Switch Puzzle',
        description: 'Toggle switches to open the door',
        difficulty: 'medium',
        categoryId: 'cat-1',
        conditions: { switches: [true, false, true] },
        effects: { doorOpen: true },
      };

      const result = await service.create(dto, 'admin-1');

      expect(result.id).toBe('puz-uuid');
      expect(result.title).toBe(dto.title);
      expect(result.authorId).toBe('admin-1');
      expect(result.category).toEqual(category);
      expect(result.conditions).toEqual(dto.conditions);
      expect(result.effects).toEqual(dto.effects);
      expect(mockCategoryRepository.findOne).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
      expect(mockPuzzleRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      const dto = {
        title: 'Broken Category',
        description: 'Test description',
        difficulty: 'easy',
        categoryId: 'non-existent-id',
        conditions: {},
        effects: {},
      };

      await expect(service.create(dto, 'admin-1')).rejects.toThrow(NotFoundException);
      expect(mockPuzzleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('submitDraft', () => {
    it('should create a puzzle with submissionStatus pending', async () => {
      const category = { id: 'cat-1', name: 'Logic' };
      mockCategoryRepository.findOne.mockResolvedValue(category);

      const dto = {
        title: 'Draft Puzzle',
        description: 'Test description',
        difficulty: 'hard',
        categoryId: 'cat-1',
        conditions: {},
        effects: {},
      };

      const result = await service.submitDraft(dto, 'player-1');

      expect(result.id).toBe('puz-uuid');
      expect(mockPuzzleRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Draft Puzzle',
        authorId: 'player-1',
        submissionStatus: 'pending',
      }));
      expect(mockPuzzleRepository.save).toHaveBeenCalled();
    });
  });

  describe('findMySubmissions', () => {
    it('should return puzzles by authorId', async () => {
      mockPuzzleRepository.find.mockResolvedValue([{ id: 'puz-1' }]);

      const result = await service.findMySubmissions('author-1');

      expect(result).toEqual([{ id: 'puz-1' }]);
      expect(mockPuzzleRepository.find).toHaveBeenCalledWith({
        where: { authorId: 'author-1' },
        order: { createdAt: 'DESC' },
        relations: { category: true },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated puzzles and apply filters', async () => {
      const mockPuzzles = [{ id: 'puz-1', title: 'Puzzle 1', difficulty: 'easy' }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockPuzzles, 1]);

      const filter = {
        page: 1,
        limit: 10,
        difficulty: 'easy',
        category: 'logic-slug',
      };

      const result = await service.findAll(filter);

      expect(result).toEqual({
        data: mockPuzzles,
        total: 1,
        page: 1,
        limit: 10,
      });

      expect(mockPuzzleRepository.createQueryBuilder).toHaveBeenCalledWith('puzzle');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('puzzle.category', 'category');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('puzzle.difficulty = :difficulty', {
        difficulty: 'easy',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.slug = :categorySlug', {
        categorySlug: 'logic-slug',
      });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should filter by category UUID if category parameter is a valid UUID', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      const uuid = '550e8400-e29b-41d4-a716-446655440000';

      await service.findAll({ category: uuid });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('category.id = :categoryId', {
        categoryId: uuid,
      });
    });

    it('should filter by one or more tag slugs', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ tags: 'deduction, multi-step' });

      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'puzzle.tags',
        'filterTags',
        'filterTags.slug IN (:...tagSlugs)',
        { tagSlugs: ['deduction', 'multi-step'] },
      );
    });

    it('should not join for tags when the tags filter is empty', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ tags: '  ,  ' });

      expect(mockQueryBuilder.innerJoin).not.toHaveBeenCalled();
    });

    it('should match puzzle title, description, and tag names when searching', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'switch' });

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('puzzle.tags', 'searchTags');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(puzzle.title ILIKE :search OR puzzle.description ILIKE :search OR searchTags.name ILIKE :search)',
        { search: '%switch%' },
      );
    });
  });

  describe('findOne', () => {
    it('should return a puzzle with its category', async () => {
      const puzzle = { id: 'puz-1', title: 'P1', category: { id: 'cat-1' } };
      mockPuzzleRepository.findOne.mockResolvedValue(puzzle);

      const result = await service.findOne('puz-1');

      expect(result).toEqual(puzzle);
      expect(mockPuzzleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'puz-1' },
        relations: { category: true, tags: true },
      });
    });

    it('should throw NotFoundException if puzzle not found', async () => {
      mockPuzzleRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update fields and verify category', async () => {
      const puzzle = { id: 'puz-1', title: 'Old Title', category: null };
      const newCategory = { id: 'cat-2', name: 'New' };

      mockPuzzleRepository.findOne.mockResolvedValue(puzzle);
      mockCategoryRepository.findOne.mockResolvedValue(newCategory);

      const result = await service.update('puz-1', {
        title: 'New Title',
        categoryId: 'cat-2',
      });

      expect(result.title).toBe('New Title');
      expect(result.category).toEqual(newCategory);
      expect(mockPuzzleRepository.save).toHaveBeenCalledWith(puzzle);
    });

    it('should allow setting category to null', async () => {
      const puzzle = { id: 'puz-1', title: 'P1', category: { id: 'cat-1' } };
      mockPuzzleRepository.findOne.mockResolvedValue(puzzle);

      const result = await service.update('puz-1', { categoryId: null });

      expect(result.category).toBeNull();
      expect(mockPuzzleRepository.save).toHaveBeenCalledWith(puzzle);
    });
  });

  describe('remove', () => {
    it('should remove the puzzle if it exists', async () => {
      const puzzle = { id: 'puz-1' };
      mockPuzzleRepository.findOne.mockResolvedValue(puzzle);

      await service.remove('puz-1');

      expect(mockPuzzleRepository.findOne).toHaveBeenCalledWith({ where: { id: 'puz-1' } });
      expect(mockPuzzleRepository.remove).toHaveBeenCalledWith(puzzle);
    });

    it('should throw NotFoundException if puzzle to remove does not exist', async () => {
      mockPuzzleRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPuzzleRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('setTags', () => {
    it('should allow the puzzle author to set tags', async () => {
      const puzzle = { id: 'puz-1', authorId: 'author-1', tags: [] };
      const tags = [{ id: 'tag-1' }, { id: 'tag-2' }];
      mockPuzzleRepository.findOne.mockResolvedValue(puzzle);
      mockTagRepository.find.mockResolvedValue(tags);

      const result = await service.setTags('puz-1', ['tag-1', 'tag-2'], 'author-1', Role.USER);

      expect(result.tags).toEqual(tags);
      expect(mockPuzzleRepository.save).toHaveBeenCalledWith(puzzle);
    });

    it('should allow an admin to set tags on any puzzle', async () => {
      const puzzle = { id: 'puz-1', authorId: 'author-1', tags: [] };
      const tags = [{ id: 'tag-1' }];
      mockPuzzleRepository.findOne.mockResolvedValue(puzzle);
      mockTagRepository.find.mockResolvedValue(tags);

      const result = await service.setTags('puz-1', ['tag-1'], 'admin-1', Role.ADMIN);

      expect(result.tags).toEqual(tags);
    });

    it('should throw ForbiddenException if the user is neither the author nor an admin', async () => {
      const puzzle = { id: 'puz-1', authorId: 'author-1', tags: [] };
      mockPuzzleRepository.findOne.mockResolvedValue(puzzle);

      await expect(service.setTags('puz-1', ['tag-1'], 'other-user', Role.USER)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPuzzleRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if the puzzle does not exist', async () => {
      mockPuzzleRepository.findOne.mockResolvedValue(null);

      await expect(service.setTags('missing', ['tag-1'], 'author-1', Role.USER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if one or more tag ids do not exist', async () => {
      const puzzle = { id: 'puz-1', authorId: 'author-1', tags: [] };
      mockPuzzleRepository.findOne.mockResolvedValue(puzzle);
      mockTagRepository.find.mockResolvedValue([{ id: 'tag-1' }]);

      await expect(service.setTags('puz-1', ['tag-1', 'missing-tag'], 'author-1', Role.USER)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPuzzleRepository.save).not.toHaveBeenCalled();
    });

    it('should clear tags when given an empty array', async () => {
      const puzzle = { id: 'puz-1', authorId: 'author-1', tags: [{ id: 'tag-1' }] };
      mockPuzzleRepository.findOne.mockResolvedValue(puzzle);

      const result = await service.setTags('puz-1', [], 'author-1', Role.USER);

      expect(result.tags).toEqual([]);
      expect(mockTagRepository.find).not.toHaveBeenCalled();
    });
  });
});
