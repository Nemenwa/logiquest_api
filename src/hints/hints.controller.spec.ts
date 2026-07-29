import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HintsController } from './hints.controller';
import { HintsService } from './hints.service';
import { SessionsService } from '../sessions/sessions.service';
import { Session } from '../sessions/entities/session.entity';
import { ScoringService } from '../scoring/scoring.service';
import { Score } from '../scoring/entities/score.entity';
import { EventBusService } from '../common/events/event-bus.service';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('HintsController', () => {
  let controller: HintsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HintsController],
      providers: [
        HintsService,
        SessionsService,
        { provide: getRepositoryToken(Session), useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), find: jest.fn() } },
        ScoringService,
        { provide: getRepositoryToken(Score), useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: EventBusService, useValue: { emit: jest.fn() } },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<HintsController>(HintsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
