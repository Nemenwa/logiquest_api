import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitSolutionDto } from './dto/submit-solution.dto';
import { resolveLocale } from '../config/locale.helper';

@ApiTags('sessions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('sessions')
@ApiResponse({ status: 401, description: 'Unauthenticated' })
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new puzzle session for the authenticated user' })
  @ApiBody({ type: CreateSessionDto })
  @ApiHeader({ name: 'accept-language', required: false, description: 'BCP-47 locale used for the session if not specified in body' })
  @ApiResponse({ status: 201, description: 'Session created and returned' })
  @ApiResponse({ status: 404, description: 'Puzzle not found' })
  start(
    @Request() req,
    @Body() dto: CreateSessionDto,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ) {
    const locale = dto.locale ?? resolveLocale(acceptLanguage);
    return this.sessionsService.start(req.user.id, dto, locale);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit a solution for an active session' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiBody({ type: SubmitSolutionDto })
  @ApiResponse({ status: 200, description: 'Solution evaluated — session marked completed or failed' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 409, description: 'Session is not in an active state' })
  submit(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SubmitSolutionDto,
  ) {
    return this.sessionsService.submit(req.user.id, id, dto);
  }

  @Patch(':id/abandon')
  @ApiOperation({ summary: 'Abandon an active session' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Session marked as abandoned' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  abandon(@Request() req, @Param('id') id: string) {
    return this.sessionsService.abandon(req.user.id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single session by ID (owner only)' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Session detail' })
  @ApiResponse({ status: 403, description: 'Forbidden — can only view own sessions' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  getById(@Request() req, @Param('id') id: string) {
    return this.sessionsService.getById(req.user.id, id);
  }
}
