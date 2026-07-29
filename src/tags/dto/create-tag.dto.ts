import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'mathematics', description: 'Tag display name (slug is auto-generated)' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
