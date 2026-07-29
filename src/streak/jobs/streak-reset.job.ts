import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StreakService } from '../services/streak.service';

@Injectable()
export class StreakResetJob {
  private readonly logger = new Logger(StreakResetJob.name);

  constructor(private readonly streakService: StreakService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'UTC' })
  async handleStreakReset() {
    this.logger.log('Running daily streak reset job...');
    try {
      const resetCount = await this.streakService.resetExpiredStreaks();
      this.logger.log(`Reset ${resetCount} expired streaks`);
    } catch (error) {
      this.logger.error('Streak reset job failed', error.stack);
    }
  }
}