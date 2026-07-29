import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEmail, MinLength, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'janedoe', description: 'New unique username' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'jane@example.com', description: 'New email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'NewP@ss1!', description: 'New password — will be re-hashed (min 8 chars)', minLength: 8 })
  @IsOptional()
  @MinLength(8)
  password?: string;
}
