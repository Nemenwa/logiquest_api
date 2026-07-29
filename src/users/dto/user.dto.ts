import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UserDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'User UUID' })
  id: string;

  @ApiProperty({ example: 'johndoe', description: 'Unique username' })
  username: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.PLAYER, description: 'User role' })
  role: UserRole;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Account creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-06-01T08:00:00.000Z', description: 'Last update timestamp' })
  updatedAt: Date;
}
