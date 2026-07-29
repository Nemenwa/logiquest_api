import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, IsOptional, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPuzzlesFilterDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-based)', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page (max 100)', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'medium', description: 'Filter by difficulty level (easy | medium | hard)' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ example: 'logic', description: 'Filter by category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'math,visual', description: 'Comma-separated list of tag slugs to filter by' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ example: 'missing key', description: 'Full-text search term matched against title and description' })
  @IsOptional()
  @IsString()
  search?: string;
}
