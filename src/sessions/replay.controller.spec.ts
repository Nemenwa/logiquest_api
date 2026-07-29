import { Test, TestingModule } from '@nestjs/testing';
import { ReplayController } from './replay.controller';
import { ReplayService } from './replay.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SessionStatus } from './entities/session.entity';
import { ReplayEventType } from './entities/session-replay-event.entity';
import { RecordReplayEventDto } from './dto/record-replay-event.dto';

const mockReplayService = {
  listReplays: jest.fn(),
  getReplay: jest.fn(),
  recordEvent: jest.fn(),
};

describe('ReplayController', () => {
  let controller: ReplayController;

  const mockUser = { id: 'user-1' };
  const mockRequest = { user: mockUser };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReplayController],
      providers: [
        { provide: ReplayService, useValue: mockReplayService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReplayController>(ReplayController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listReplays', () => {
    it('calls replayService.listReplays with the authenticated user id', async () => {
      const sessions = [{ id: 'session-1', status: SessionStatus.COMPLETED }];
      mockReplayService.listReplays.mockResolvedValue(sessions);

      const result = await controller.listReplays(mockRequest);

      expect(mockReplayService.listReplays).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(sessions);
    });
  });

  describe('getReplay', () => {
    it('calls replayService.getReplay with userId and sessionId', async () => {
      const replay = {
        sessionId: 'session-1',
        userId: 'user-1',
        puzzleId: 'puzzle-1',
        totalEvents: 2,
        events: [],
      };
      mockReplayService.getReplay.mockResolvedValue(replay);

      const result = await controller.getReplay(mockRequest, 'session-1');

      expect(mockReplayService.getReplay).toHaveBeenCalledWith('user-1', 'session-1');
      expect(result).toEqual(replay);
    });
  });

  describe('recordEvent', () => {
    it('calls replayService.recordEvent with the provided dto', async () => {
      const dto: RecordReplayEventDto = {
        sessionId: 'session-1',
        userId: 'user-1',
        puzzleId: 'puzzle-1',
        sequence: 1,
        eventType: ReplayEventType.SESSION_STARTED,
        payload: {},
      };
      const savedEvent = { id: 'event-1', ...dto };
      mockReplayService.recordEvent.mockResolvedValue(savedEvent);

      const result = await controller.recordEvent(dto);

      expect(mockReplayService.recordEvent).toHaveBeenCalledWith(dto);
      expect(result).toEqual(savedEvent);
    });
  });
});
