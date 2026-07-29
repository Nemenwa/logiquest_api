import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class SessionFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'completed', description: 'Filter by session status (active | completed | abandoned)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2024-01-01', description: 'ISO date — include sessions started on or after this date' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'ISO date — include sessions started on or before this date' })
  @IsOptional()
  @IsString()
  endDate?: string;
}
