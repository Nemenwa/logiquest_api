import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PuzzleTranslationHintDto {
  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({ example: 'Regardez le motif de droite à gauche.' })
  content: string;
}

/**
 * Shape returned by the admin translation endpoints.
 * Excludes internal DB fields that callers don't need.
 */
export class PuzzleTranslationResponseDto {
  @ApiProperty({ example: 'uuid-translation-id' })
  id!: string;

  @ApiProperty({ example: 'uuid-puzzle-id' })
  puzzleId!: string;

  @ApiProperty({ example: 'fr', description: 'BCP-47 locale tag' })
  locale!: string;

  @ApiProperty({ example: 'La Clé Manquante' })
  title!: string;

  @ApiProperty({ example: 'Trouvez la clé qui ouvre le coffre.' })
  description!: string;

  @ApiPropertyOptional({ type: [PuzzleTranslationHintDto], nullable: true })
  hints!: Array<{ order: number; content: string }> | null;

  @ApiProperty({ example: '2024-03-01T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-06-15T09:30:00.000Z' })
  updatedAt!: Date;
}
