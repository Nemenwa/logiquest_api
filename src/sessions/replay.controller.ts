import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReplayService } from './replay.service';
import { RecordReplayEventDto } from './dto/record-replay-event.dto';

/**
 * Provides endpoints for the Player Replay System.
 *
 * GET  /sessions/replays            – list all replayable (completed) sessions for the current user
 * GET  /sessions/:id/replay         – fetch the full event timeline for a specific completed session
 * POST /sessions/replay/event       – record an individual replay event (internal/service-to-service use)
 */
@ApiTags('replay')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('sessions')
@ApiResponse({ status: 401, description: 'Unauthenticated' })
export class ReplayController {
  constructor(private readonly replayService: ReplayService) {}

  @Get('replays')
  @ApiOperation({ summary: 'List all completed sessions with replay data for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Array of replayable sessions' })
  listReplays(@Request() req) {
    return this.replayService.listReplays(req.user.id);
  }

  @Get(':id/replay')
  @ApiOperation({ summary: 'Get the full event timeline for a completed session (owner only)' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Ordered list of replay events for the session' })
  @ApiResponse({ status: 403, description: 'Forbidden — can only view own session replays' })
  @ApiResponse({ status: 404, description: 'Session not found or has no replay data' })
  getReplay(@Request() req, @Param('id') id: string) {
    return this.replayService.getReplay(req.user.id, id);
  }

  @Post('replay/event')
  @ApiOperation({ summary: 'Record a single replay event (internal / service-to-service use)' })
  @ApiBody({ type: RecordReplayEventDto })
  @ApiResponse({ status: 201, description: 'Replay event recorded' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  recordEvent(@Body() dto: RecordReplayEventDto) {
    return this.replayService.recordEvent(dto);
  }
}
