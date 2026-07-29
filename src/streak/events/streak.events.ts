import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

@Injectable()
export class StreakEvents extends EventEmitter {
  constructor() {
    super();
    this.setupListeners();
  }

  private setupListeners(): void {
    this.on('streak:milestone', ({ userId, streak, milestone }) => {
      console.log(`🏆 Achievement unlocked: ${milestone}-day streak for user ${userId}`);
      // Wire to your AchievementService
    });

    this.on('streak:stellaReward', ({ userId, streak, stellaAmount }) => {
      console.log(`💎 Stella reward: +${stellaAmount} for ${streak}-day streak (user ${userId})`);
      // Wire to your EconomyService
    });

    this.on('streak:reset', ({ userId, previousStreak }) => {
      console.log(`💔 Streak reset for user ${userId}. Was: ${previousStreak} days`);
    });
  }
}