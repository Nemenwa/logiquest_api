import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { NotificationType } from '../notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ example: 'uuid-user-id', description: 'UUID of the user to notify' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.ACHIEVEMENT_UNLOCKED, description: 'Notification type' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: 'You unlocked the "First Blood" achievement!', description: 'Notification message text' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
