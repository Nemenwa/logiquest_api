import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'UUID of the puzzle to start a session for' })
  @IsString()
  @IsNotEmpty()
  puzzleId!: string;

  /**
   * Optional BCP-47 locale tag to record against this session.
   * If omitted, the locale is inferred from the request's Accept-Language header.
   */
  @ApiPropertyOptional({
    example: 'fr',
    description: 'BCP-47 locale tag for this session. If omitted, resolved from the Accept-Language header.',
  })
  @IsOptional()
  @IsString()
  locale?: string;
}
