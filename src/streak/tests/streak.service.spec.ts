import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { StreakService } from '../services/streak.service';
import { Streak } from '../schemas/streak.schema';
import { StreakEvents } from '../events/streak.events';
import { Model, Types } from 'mongoose';

const mockStreakModel = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  constructor: jest.fn().mockImplementation((dto) => ({
    ...dto,
    save: jest.fn().mockResolvedValue({ ...dto, _id: new Types.ObjectId() }),
  })),
});

describe('StreakService', () => {
  let service: StreakService;
  let model: Model<Streak>;
  let events: StreakEvents;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreakService,
        StreakEvents,
        { provide: getModelToken(Streak.name), useValue: mockStreakModel() },
      ],
    }).compile();

    service = module.get<StreakService>(StreakService);
    model = module.get<Model<Streak>>(getModelToken(Streak.name));
    events = module.get<StreakEvents>(StreakEvents);
    jest.spyOn(events, 'emit').mockImplementation(() => true);
  });

  it('should create streak on first completion', async () => {
    const mockSave = jest.fn().mockResolvedValue({
      userId: new Types.ObjectId(),
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: new Date(),
    });
    
    model.findOne = jest.fn().mockResolvedValue(null);
    (model as any).constructor = jest.fn().mockImplementation(() => ({
      save: mockSave,
    }));

    const result = await service.recordPuzzleCompletion('user123');
    expect(result.currentStreak).toBe(1);
  });

  it('should not double-count same day', async () => {
    const today = new Date();
    model.findOne = jest.fn().mockResolvedValue({
      userId: new Types.ObjectId(),
      currentStreak: 5,
      lastActiveDate: today,
      save: jest.fn(),
    });

    const result = await service.recordPuzzleCompletion('user123');
    expect(result.currentStreak).toBe(5);
  });

  it('should reset streak after missing a day', async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
    
    const mockSave = jest.fn();
    model.findOne = jest.fn().mockResolvedValue({
      userId: new Types.ObjectId(),
      currentStreak: 10,
      longestStreak: 10,
      lastActiveDate: twoDaysAgo,
      save: mockSave,
    });

    await service.recordPuzzleCompletion('user123');
    const savedStreak = mockSave.mock.calls[0][0];
    expect(savedStreak.currentStreak).toBe(1);
  });

  it('should emit milestone at 7 days', async () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    
    const mockSave = jest.fn();
    model.findOne = jest.fn().mockResolvedValue({
      userId: new Types.ObjectId(),
      currentStreak: 6,
      longestStreak: 6,
      lastActiveDate: yesterday,
      save: mockSave,
    });

    await service.recordPuzzleCompletion('user123');
    expect(events.emit).toHaveBeenCalledWith('streak:milestone', expect.any(Object));
  });
});