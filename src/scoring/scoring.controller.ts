import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ScoringService } from './scoring.service';

/**
 * Controller exposing scoring information.
 */
@ApiTags('scoring')
@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get('player/:userId')
  @ApiOperation({ summary: 'Get score summary for a player (total score, puzzle count, avg score)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Player score summary' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPlayerScore(@Param('userId') userId: string) {
    return this.scoringService.getPlayerScoreSummary(userId);
  }
}
