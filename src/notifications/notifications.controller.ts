import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
@ApiResponse({ status: 401, description: 'Unauthenticated' })
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List the authenticated user's notifications" })
  @ApiResponse({ status: 200, description: 'Array of notifications (including unread) ordered by creation date descending' })
  async getUserNotifications(@Request() req) {
    const userId = req.user.id;
    return this.service.findByUser(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read', schema: { example: { success: true } } })
  @ApiResponse({ status: 404, description: 'Notification not found or does not belong to user' })
  async markRead(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    await this.service.markAsRead(id, userId);
    return { success: true };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for the authenticated user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read', schema: { example: { success: true } } })
  async markAllRead(@Request() req) {
    const userId = req.user.id;
    await this.service.markAllAsRead(userId);
    return { success: true };
  }
}
