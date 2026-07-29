import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HintItemDto {
  @ApiProperty({ example: 1, description: 'Display order of the hint (1-based)' })
  @IsInt()
  @Min(1)
  order!: number;

  @ApiProperty({ example: 'Look at the pattern from right to left.', description: 'Hint text content' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class UpsertPuzzleTranslationDto {
  @ApiProperty({ example: 'fr', description: 'BCP-47 locale tag (e.g. en, fr, es, de)' })
  @IsString()
  @IsNotEmpty()
  locale!: string;

  @ApiProperty({ example: 'La Clé Manquante', description: 'Translated puzzle title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Trouvez la clé qui ouvre le coffre.', description: 'Translated puzzle description' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    type: [HintItemDto],
    nullable: true,
    description: 'Ordered list of translated hints; pass null to clear hints for this locale',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HintItemDto)
  hints?: HintItemDto[] | null;
}
