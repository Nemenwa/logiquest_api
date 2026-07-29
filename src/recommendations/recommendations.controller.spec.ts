import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let service: RecommendationsService;

  beforeEach(async () => {
    const mockRecommendationsService = {
      getRecommendations: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        {
          provide: RecommendationsService,
          useValue: mockRecommendationsService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
    service = module.get<RecommendationsService>(RecommendationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getRecommendations with correct arguments', async () => {
    const req = { user: { id: 'user123' } };
    await controller.getRecommendations(req, 'challenge');
    expect(service.getRecommendations).toHaveBeenCalledWith('user123', 'challenge');
  });

  it('should fallback to req.user.userId if id is not present', async () => {
    const req = { user: { userId: 'user456' } };
    await controller.getRecommendations(req);
    expect(service.getRecommendations).toHaveBeenCalledWith('user456', undefined);
  });
});
