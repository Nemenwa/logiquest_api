import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { TagsService } from './tags.service';
import { Tag } from './entities/tag.entity';

describe('TagsService', () => {
  let service: TagsService;

  const mockTagRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((tag) => Promise.resolve({ id: 'tag-uuid', ...tag, createdAt: new Date() })),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagRepository,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should generate a slug and save the tag', async () => {
      mockTagRepository.findOne.mockResolvedValue(null);

      const dto = { name: 'Multi Step' };
      const result = await service.create(dto);

      expect(result.id).toBe('tag-uuid');
      expect(result.name).toBe(dto.name);
      expect(result.slug).toBe('multi-step');
      expect(mockTagRepository.findOne).toHaveBeenCalledWith({ where: { slug: 'multi-step' } });
      expect(mockTagRepository.create).toHaveBeenCalledWith({ name: dto.name, slug: 'multi-step' });
      expect(mockTagRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if slug already exists', async () => {
      mockTagRepository.findOne.mockResolvedValue({ id: 'existing-id', slug: 'deduction' });

      const dto = { name: 'Deduction' };
      await expect(service.create(dto)).rejects.toThrow(ConflictException);

      expect(mockTagRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAllWithPuzzleCount', () => {
    it('should return tags with puzzle counts', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'Deduction',
          slug: 'deduction',
          createdAt: new Date(),
          puzzles: [{ id: 'p1' }, { id: 'p2' }],
        },
        {
          id: 'tag-2',
          name: 'Time Pressure',
          slug: 'time-pressure',
          createdAt: new Date(),
          puzzles: [],
        },
      ];
      mockTagRepository.find.mockResolvedValue(mockTags);

      const result = await service.findAllWithPuzzleCount();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'tag-1',
        name: 'Deduction',
        slug: 'deduction',
        createdAt: mockTags[0].createdAt,
        puzzleCount: 2,
      });
      expect(result[1].puzzleCount).toBe(0);
      expect(mockTagRepository.find).toHaveBeenCalledWith({ relations: { puzzles: true } });
    });
  });
});
