import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsUUID, IsObject } from 'class-validator';

export class UpdatePuzzleDto {
  @ApiPropertyOptional({ example: 'The Missing Key — Revised', description: 'Updated puzzle title' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ example: 'An updated description with clearer clues.', description: 'Updated puzzle description' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({ example: 'hard', description: 'Updated difficulty level (easy | medium | hard)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  difficulty?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nullable: true,
    description: 'Category UUID; pass null to remove the category association',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({
    example: { type: 'sequence', values: [1, 1, 2, 3, 5] },
    description: 'Updated win conditions JSON',
  })
  @IsOptional()
  @IsObject()
  @IsNotEmpty()
  conditions?: any;

  @ApiPropertyOptional({
    example: { scoreMultiplier: 2.0 },
    description: 'Updated effects / rewards JSON',
  })
  @IsOptional()
  @IsObject()
  @IsNotEmpty()
  effects?: any;
}
