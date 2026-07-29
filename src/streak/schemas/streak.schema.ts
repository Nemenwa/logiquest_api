import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Streak extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Number, default: 0, min: 0 })
  currentStreak: number;

  @Prop({ type: Number, default: 0, min: 0 })
  longestStreak: number;

  @Prop({ type: Date, default: null })
  lastActiveDate: Date;
}

export const StreakSchema = SchemaFactory.createForClass(Streak);

// Auto-update longestStreak
StreakSchema.pre('save', function (next) {
  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }
  next();
});