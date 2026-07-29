import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CalibrationService } from './calibration.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('admin/calibration')
@ApiBearerAuth('access-token')
@Controller('admin/calibration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiResponse({ status: 401, description: 'Unauthenticated' })
@ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
export class CalibrationController {
  constructor(private readonly calibrationService: CalibrationService) {}

  @Get()
  @ApiOperation({ summary: 'List all pending difficulty calibration recommendations' })
  @ApiResponse({ status: 200, description: 'Array of calibration records with current and recommended difficulty levels' })
  getCalibrations() {
    return this.calibrationService.findAll();
  }

  @Patch(':puzzleId/apply')
  @ApiOperation({ summary: 'Apply the recommended difficulty for a puzzle' })
  @ApiParam({ name: 'puzzleId', description: 'Puzzle UUID' })
  @ApiResponse({ status: 200, description: 'Difficulty updated to the recommended level; calibration status set to applied' })
  @ApiResponse({ status: 404, description: 'Calibration record not found' })
  applyRecommendation(@Param('puzzleId') puzzleId: string) {
    return this.calibrationService.applyRecommendation(puzzleId);
  }

  @Patch(':puzzleId/dismiss')
  @ApiOperation({ summary: 'Dismiss the calibration recommendation for a puzzle' })
  @ApiParam({ name: 'puzzleId', description: 'Puzzle UUID' })
  @ApiResponse({ status: 200, description: 'Calibration dismissed — difficulty unchanged' })
  @ApiResponse({ status: 404, description: 'Calibration record not found' })
  dismissRecommendation(@Param('puzzleId') puzzleId: string) {
    return this.calibrationService.dismissRecommendation(puzzleId);
  }
}
