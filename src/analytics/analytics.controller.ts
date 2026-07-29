import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('analytics')
@Controller('analytics')
@UseInterceptors(CacheInterceptor)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('puzzles/:id')
  @ApiOperation({ summary: 'Get solve-rate, duration, and hint-usage analytics for a specific puzzle' })
  @ApiParam({ name: 'id', description: 'Puzzle UUID' })
  @ApiResponse({ status: 200, description: 'Aggregated puzzle analytics within the requested date range' })
  @ApiResponse({ status: 404, description: 'Puzzle not found' })
  async getPuzzleAnalytics(
    @Param('id') id: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getPuzzleAnalytics(id, query);
  }

  @Get('player/:userId')
  @ApiOperation({ summary: 'Get session count, total score, and solve-rate analytics for a player' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Aggregated player analytics within the requested date range' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPlayerAnalytics(
    @Param('userId') userId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getPlayerAnalytics(userId, query);
  }

  @UseGuards(AdminGuard)
  @Get('overview')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get platform-wide analytics overview (admin only)' })
  @ApiResponse({ status: 200, description: 'Platform-level aggregated metrics' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  async getOverview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOverview(query);
  }
}
