import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('recommendations')
@ApiBearerAuth('access-token')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiResponse({ status: 401, description: 'Unauthenticated' })
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get personalised puzzle recommendations for the authenticated user' })
  @ApiQuery({
    name: 'mode',
    required: false,
    description: 'Recommendation strategy — e.g. "difficulty-ramp", "category-explore", "random"',
    example: 'difficulty-ramp',
  })
  @ApiResponse({ status: 200, description: 'Array of recommended puzzles tailored to the user\'s history and skill level' })
  async getRecommendations(
    @Request() req: any,
    @Query('mode') mode?: string,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.recommendationsService.getRecommendations(userId, mode);
  }
}
