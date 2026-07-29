import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import type { HealthCheckResult } from './health.types';
import { HealthService } from './health.service';

/**
 * Exposes Kubernetes-style health probes.
 *
 * - `@Public()` excludes the routes from JWT authentication once a global auth
 *   guard is added — orchestrators and load balancers must reach these
 *   endpoints unauthenticated.
 * - `@SkipThrottle()` exempts them from the global rate limiter, since probes
 *   are polled frequently and must not be throttled out of service.
 */
@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Liveness probe: returns 200 as long as the process can serve requests.
   * Used by orchestrators to decide whether to restart the container.
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe — confirms the process is running' })
  @ApiResponse({
    status: 200,
    description: 'Process is alive',
    schema: { example: { status: 'ok', info: { process: { status: 'up' } }, error: {}, details: { process: { status: 'up' } }, uptime: 3600.5, timestamp: '2024-07-01T12:00:00.000Z' } },
  })
  liveness(): Promise<HealthCheckResult> {
    return this.health.checkLiveness();
  }

  /**
   * Readiness probe: returns 200 when all dependencies are healthy, or a
   * structured 503 (Service Unavailable) when any dependency is down so the
   * service is taken out of rotation rather than served a generic 500.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — confirms all dependencies (DB, cache) are reachable' })
  @ApiResponse({
    status: 200,
    description: 'All dependencies are healthy',
    schema: { example: { status: 'ok', info: { db: { status: 'up' } }, error: {}, details: { db: { status: 'up' } }, uptime: 3600.5, timestamp: '2024-07-01T12:00:00.000Z' } },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more dependencies are unhealthy — service is not ready',
    schema: { example: { status: 'error', info: {}, error: { db: { status: 'down', message: 'Connection refused' } }, details: { db: { status: 'down' } }, uptime: 3600.5, timestamp: '2024-07-01T12:00:00.000Z' } },
  })
  async readiness(): Promise<HealthCheckResult> {
    const result = await this.health.checkReadiness();
    if (result.status !== 'ok') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
