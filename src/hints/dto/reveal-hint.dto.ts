import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RevealHintDto {
  @ApiProperty({ example: 'uuid-session-id', description: 'UUID of the active session to reveal the next hint for' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
