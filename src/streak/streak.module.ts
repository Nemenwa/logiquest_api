import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { Streak, StreakSchema } from './schemas/streak.schema';
import { StreakService } from './services/streak.service';
import { StreakController } from './controllers/streak.controller';
import { StreakResetJob } from './jobs/streak-reset.job';
import { StreakEvents } from './events/streak.events';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Streak.name, schema: StreakSchema }]),
    ScheduleModule.forRoot(),
  ],
  controllers: [StreakController],
  providers: [StreakService, StreakResetJob, StreakEvents],
  exports: [StreakService],
})
export class StreakModule {}