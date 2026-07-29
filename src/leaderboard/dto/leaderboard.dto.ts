import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class LeaderboardQueryDto {
  @ApiPropertyOptional({ example: 20, description: 'Number of entries per page (max 100)', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 1, description: 'Page number (1-based)', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 'logic', description: 'Filter rankings by puzzle category slug' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class LeaderboardEntryDto {
  @ApiProperty({ example: 'uuid-user-id', description: 'User UUID' })
  userId: string;

  @ApiProperty({ example: 4200, description: 'Cumulative score across all solved puzzles' })
  totalScore: number;

  @ApiPropertyOptional({ example: 'logic', description: 'Category slug if this is a category-scoped ranking' })
  category?: string;

  @ApiProperty({ example: 1, description: 'Rank position on the leaderboard' })
  rank: number;
}
