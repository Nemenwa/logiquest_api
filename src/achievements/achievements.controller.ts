import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AchievementsService } from './achievements.service';

@ApiTags('achievements')
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly service: AchievementsService) {}

  @Get()
  @ApiOperation({ summary: 'List the full achievement catalogue' })
  @ApiResponse({ status: 200, description: 'Array of all achievements with rarity and conditions' })
  async getAll() {
    return this.service.getAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "List the authenticated user's unlocked achievements" })
  @ApiResponse({ status: 200, description: 'Array of achievements unlocked by the current user, with unlock timestamps' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async getMyAchievements(@Request() req) {
    const userId = req.user.sub;
    return this.service.getForUser(userId);
  }
}
