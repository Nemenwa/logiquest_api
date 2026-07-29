import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Logic & Reasoning', description: 'Updated category display name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description for this category.', description: 'Updated category description' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;
}
