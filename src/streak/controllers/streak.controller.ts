import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { StreakService } from '../services/streak.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; // Adjust path to your auth guard

@Controller('streaks')
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyStreak(@Request() req) {
    const userId = req.user.userId; // Adjust based on your JWT payload
    const streak = await this.streakService.getStreak(userId);
    const isActiveToday = streak.lastActiveDate
      ? new Date().toISOString().split('T')[0] === streak.lastActiveDate.toISOString().split('T')[0]
      : false;

    return {
      success: true,
      data: {
        ...streak,
        isActiveToday,
      },
    };
  }
}