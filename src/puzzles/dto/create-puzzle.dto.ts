import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsObject, IsString, IsUUID } from 'class-validator';

export class CreatePuzzleDto {
  @ApiProperty({ example: 'The Missing Key', description: 'Puzzle title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Find the key that unlocks the vault by applying logical deduction.', description: 'Full puzzle description shown to players' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 'medium', description: 'Difficulty level (easy | medium | hard)' })
  @IsString()
  @IsNotEmpty()
  difficulty!: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'UUID of the category this puzzle belongs to' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    example: { type: 'sequence', values: [1, 2, 3, 5, 8] },
    description: 'JSON object describing the puzzle win conditions',
  })
  @IsObject()
  @IsNotEmpty()
  conditions!: any;

  @ApiProperty({
    example: { scoreMultiplier: 1.5, unlockBadge: 'logic-master' },
    description: 'JSON object describing the rewards and side-effects on completion',
  })
  @IsObject()
  @IsNotEmpty()
  effects!: any;
}
