import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Session } from '../sessions/entities/session.entity';
import { Reward } from '../rewards/entities/reward.entity';
import { AuditService } from '../audit/audit.service';
import { Puzzle } from '../puzzles/entities/puzzle.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaginationDto } from './dto/pagination.dto';
import { SessionFilterDto } from './dto/session-filter.dto';
import { NotFoundException } from '@nestjs/common';
import { Between } from 'typeorm';

describe('AdminService', () => {
  let service: AdminService;

  const mockUserRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };

  const mockPuzzleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockSessionRepository = {
    findAndCount: jest.fn(),
    count: jest.fn(),
  };

  const mockRewardRepository = {
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockRewardQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepository,
        },
        {
          provide: getRepositoryToken(Reward),
          useValue: mockRewardRepository,
        },
        {
          provide: getRepositoryToken(Puzzle),
          useValue: mockPuzzleRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);

    jest.clearAllMocks();
    mockRewardRepository.createQueryBuilder.mockReturnValue(mockRewardQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const users = [
        { id: '1', email: 'a@b.com', role: 'user', isBanned: false, createdAt: new Date() },
      ];
      mockUserRepository.findAndCount.mockResolvedValue([users, 1]);

      const dto: PaginationDto = { page: 1, limit: 20 };
      const result = await service.getUsers(dto);

      expect(result).toEqual({
        data: users,
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        select: { id: true, email: true, role: true, isBanned: true, createdAt: true },
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('banUser', () => {
    it('should set isBanned to true and call auditService.log', async () => {
      const user = { id: 'u1', isBanned: false };
      mockUserRepository.findOne.mockResolvedValue(user);

      await service.banUser('admin1', 'u1');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 'u1' } });
      expect(user.isBanned).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
      expect(mockAuditService.log).toHaveBeenCalledWith('BAN_USER', 'admin1', 'u1');
    });

    it('should do nothing if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.banUser('admin1', 'missing')).rejects.toBeInstanceOf(NotFoundException);

      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });
  });

  describe('getSessions', () => {
    it('should use Between when both startDate and endDate are provided', async () => {
      const sessions = [{ id: 's1' }];
      mockSessionRepository.findAndCount.mockResolvedValue([sessions, 1]);

      const dto: SessionFilterDto = {
        page: 2,
        limit: 10,
        status: 'completed',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-31T23:59:59.999Z',
      };

      const result = await service.getSessions(dto);

      expect(result).toEqual({
        data: sessions,
        total: 1,
        page: 2,
        limit: 10,
      });
      expect(mockSessionRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          status: 'completed',
          startedAt: Between(new Date(dto.startDate!), new Date(dto.endDate!)),
        },
        skip: 10,
        take: 10,
        order: { startedAt: 'DESC' },
      });
    });
  });

  describe('getStats', () => {
    it('should return correct aggregated stats', async () => {
      mockUserRepository.count.mockResolvedValue(5);
      mockSessionRepository.count.mockResolvedValue(10);
      mockRewardQueryBuilder.getRawOne.mockResolvedValue({ sum: 123.45 });

      const result = await service.getStats();

      expect(result).toEqual({
        totalUsers: 5,
        totalSessions: 10,
        totalRewardsDistributed: 123.45,
      });
      expect(mockUserRepository.count).toHaveBeenCalled();
      expect(mockSessionRepository.count).toHaveBeenCalled();
      expect(mockRewardRepository.createQueryBuilder).toHaveBeenCalledWith('reward');
      expect(mockRewardQueryBuilder.select).toHaveBeenCalledWith('SUM(reward.amount)', 'sum');
      expect(mockRewardQueryBuilder.getRawOne).toHaveBeenCalled();
    });

    it('should default totalRewardsDistributed to 0 when no rewards', async () => {
      mockUserRepository.count.mockResolvedValue(0);
      mockSessionRepository.count.mockResolvedValue(0);
      mockRewardQueryBuilder.getRawOne.mockResolvedValue({ sum: null });

      const result = await service.getStats();

      expect(result.totalRewardsDistributed).toBe(0);
    });
  });

  describe('submissions', () => {
    it('should return pending submissions', async () => {
      mockPuzzleRepository.find.mockResolvedValue([{ id: 'puz-1', submissionStatus: 'pending' }]);
      const result = await service.getPendingSubmissions();
      expect(result).toEqual([{ id: 'puz-1', submissionStatus: 'pending' }]);
      expect(mockPuzzleRepository.find).toHaveBeenCalledWith({
        where: { submissionStatus: 'pending' },
        relations: { category: true },
        order: { createdAt: 'ASC' },
      });
    });

    it('should approve a submission and emit events', async () => {
      const puzzle = { id: 'puz-1', authorId: 'author-1', submissionStatus: 'pending' };
      mockPuzzleRepository.findOne.mockResolvedValue(puzzle);

      await service.approveSubmission('admin-1', 'puz-1');

      expect(puzzle.submissionStatus).toBe('approved');
      expect(mockPuzzleRepository.save).toHaveBeenCalledWith(puzzle);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('reward.granted', expect.any(Object));
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('achievement.unlocked', expect.any(Object));
      expect(mockAuditService.log).toHaveBeenCalledWith('APPROVE_PUZZLE_SUBMISSION', 'admin-1', 'puz-1');
    });

    it('should reject a submission', async () => {
      const puzzle = { id: 'puz-1', authorId: 'author-1', submissionStatus: 'pending', rejectionReason: null };
      mockPuzzleRepository.findOne.mockResolvedValue(puzzle);

      await service.rejectSubmission('admin-1', 'puz-1', 'Too easy');

      expect(puzzle.submissionStatus).toBe('rejected');
      expect(puzzle.rejectionReason).toBe('Too easy');
      expect(mockPuzzleRepository.save).toHaveBeenCalledWith(puzzle);
      expect(mockAuditService.log).toHaveBeenCalledWith('REJECT_PUZZLE_SUBMISSION', 'admin-1', 'puz-1');
    });
  });
});
