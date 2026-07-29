import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Logic Puzzles', description: 'Category display name (slug is auto-generated)' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Puzzles that require pure deductive reasoning.', description: 'Short description of the category' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
