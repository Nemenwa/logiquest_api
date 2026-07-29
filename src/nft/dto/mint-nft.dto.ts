import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MintNftDto {
  @ApiProperty({ example: 'uuid-achievement-id', description: 'UUID of the achievement to mint as an NFT' })
  @IsString()
  @IsNotEmpty()
  achievementId!: string;
}
