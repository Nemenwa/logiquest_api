import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('admin/audit')
@ApiBearerAuth('access-token')
@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiResponse({ status: 401, description: 'Unauthenticated' })
@ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Query audit logs with optional filters and pagination' })
  @ApiQuery({ name: 'actor', required: false, description: 'Filter by acting user ID' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action name (e.g. ban_user, approve_submission)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'ISO date — include logs on or after this date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'ISO date — include logs on or before this date' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (max 100)', example: '20' })
  @ApiResponse({ status: 200, description: 'Paginated list of audit log entries' })
  async getAuditLogs(
    @Query('actor') actor?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      actor,
      action,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
