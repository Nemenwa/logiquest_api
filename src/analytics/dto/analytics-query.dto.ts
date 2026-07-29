import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsISO8601 } from 'class-validator';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ example: '2024-01-01', description: 'Start of date range (ISO 8601 date string)' })
  @IsOptional()
  @IsISO8601()
  readonly from?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'End of date range (ISO 8601 date string)' })
  @IsOptional()
  @IsISO8601()
  readonly to?: string;
}
