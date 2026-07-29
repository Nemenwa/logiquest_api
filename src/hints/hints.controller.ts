import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { HintsService } from './hints.service';
import { RevealHintDto } from './dto/reveal-hint.dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('hints')
@Controller('hints')
export class HintsController {
  constructor(private readonly hintsService: HintsService) {}

  @Post('reveal')
  @ApiOperation({ summary: 'Reveal the next hint for an active session' })
  @ApiBody({ type: RevealHintDto })
  @ApiResponse({ status: 200, description: 'Next hint revealed and returned' })
  @ApiResponse({ status: 400, description: 'No more hints available or session not active' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revealHint(@Body() revealHintDto: RevealHintDto) {
    const { sessionId } = revealHintDto;
    return this.hintsService.revealNextHint(sessionId);
  }

  @UseGuards(AdminGuard)
  @Get('puzzle/:puzzleId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all hints for a puzzle (admin only)' })
  @ApiParam({ name: 'puzzleId', description: 'Puzzle UUID' })
  @ApiResponse({ status: 200, description: 'Ordered list of hints for the puzzle' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Puzzle not found' })
  async getHintsForPuzzle(@Param('puzzleId') puzzleId: string) {
    return this.hintsService.getHintsForPuzzle(puzzleId);
  }
}
