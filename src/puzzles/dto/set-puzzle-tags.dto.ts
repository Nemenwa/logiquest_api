import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class SetPuzzleTagsDto {
  @ApiProperty({
    type: [String],
    example: ['uuid-tag-1', 'uuid-tag-2'],
    description: 'Complete list of tag UUIDs to associate with the puzzle — replaces any existing tags',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds!: string[];
}
