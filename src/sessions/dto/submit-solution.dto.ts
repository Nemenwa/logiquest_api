import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class SubmitSolutionDto {
  @ApiProperty({ example: '42', description: "The player's solution answer" })
  @IsString()
  @IsNotEmpty()
  solution!: string;

  @ApiPropertyOptional({ example: 2, description: 'Number of hints consumed during this session', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  hintsUsed?: number;
}
