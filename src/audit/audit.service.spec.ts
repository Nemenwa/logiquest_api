import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;

  const mockAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scrubPayload', () => {
    it('should deeply scrub sensitive fields', () => {
      const input = {
        username: 'admin',
        password: 'super-secret-password',
        nested: {
          token: 'jwt-token-here',
          publicField: 'hello',
          secret: {
            deepKey: 'deep-val',
            hash: 'hash-here',
          },
        },
      };

      const result = service.scrubPayload(input);

      expect(result.username).toBe('admin');
      expect(result.password).toBe('[SCRUBBED]');
      expect(result.nested.token).toBe('[SCRUBBED]');
      expect(result.nested.publicField).toBe('hello');
      // note: 'secret' is in sensitive list, so it will be replaced by [SCRUBBED]
      expect(result.nested.secret).toBe('[SCRUBBED]');
    });

    it('should ignore null, undefined, or primitive values', () => {
      expect(service.scrubPayload(null)).toBeNull();
      expect(service.scrubPayload(undefined)).toBeUndefined();
      expect(service.scrubPayload('primitive')).toBe('primitive');
    });

    it('should handle array scrubbing', () => {
      const arr = [
        { password: '123' },
        { username: 'test' },
      ];
      const result = service.scrubPayload(arr);
      expect(result[0].password).toBe('[SCRUBBED]');
      expect(result[1].username).toBe('test');
    });
  });

  describe('log', () => {
    it('should create and save a scrubbed log', async () => {
      const mockLog = { id: 'uuid-1', action: 'BAN_USER' };
      mockAuditLogRepository.create.mockReturnValue(mockLog);
      mockAuditLogRepository.save.mockResolvedValue(mockLog);

      const payload = { details: 'ban details', password: '123' };
      await service.log('BAN_USER', 'admin-id', 'user-id', 'User', payload);

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        action: 'BAN_USER',
        actorId: 'admin-id',
        targetId: 'user-id',
        targetEntity: 'User',
        payload: { details: 'ban details', password: '[SCRUBBED]' },
      });
      expect(mockAuditLogRepository.save).toHaveBeenCalledWith(mockLog);
    });
  });

  describe('findAll', () => {
    it('should default pagination structure and query without filters', async () => {
      mockAuditLogRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({});

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      expect(mockAuditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        order: { timestamp: 'DESC' },
      });
    });

    it('should format filters for actor, action, and date range', async () => {
      mockAuditLogRepository.findAndCount.mockResolvedValue([[], 0]);

      const query = {
        actor: 'user-1',
        action: 'BAN_USER',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        page: 2,
        limit: 10,
      };

      await service.findAll(query);

      expect(mockAuditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          actorId: 'user-1',
          action: 'BAN_USER',
          timestamp: Between(new Date('2026-01-01'), new Date('2026-01-02')),
        },
        skip: 10,
        take: 10,
        order: { timestamp: 'DESC' },
      });
    });

    it('should handle single date filters', async () => {
      mockAuditLogRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ startDate: '2026-01-01' });
      expect(mockAuditLogRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timestamp: MoreThanOrEqual(new Date('2026-01-01')),
          },
        })
      );

      await service.findAll({ endDate: '2026-01-01' });
      expect(mockAuditLogRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timestamp: LessThanOrEqual(new Date('2026-01-01')),
          },
        })
      );
    });
  });

  describe('immutability', () => {
    it('should not contain any update or delete methods in service', () => {
      const methods = Object.getOwnPropertyNames(AuditService.prototype);
      const mutatingMethods = methods.filter(
        (m) =>
          m.toLowerCase().includes('delete') ||
          m.toLowerCase().includes('remove') ||
          m.toLowerCase().includes('update') ||
          m.toLowerCase().includes('edit')
      );
      expect(mutatingMethods.length).toBe(0);
    });
  });
});
