import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  PLAYER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'User UUID' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'johndoe', description: 'Unique username' })
  @Column({ unique: true })
  username!: string;

  @ApiProperty({ example: 'john@example.com', description: 'Unique email address' })
  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.PLAYER, description: 'User role' })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.PLAYER })
  role!: UserRole;

  @ApiProperty({ example: false, description: 'Whether the account is banned' })
  @Column({ default: false })
  isBanned!: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Account creation timestamp' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ example: '2024-06-01T08:00:00.000Z', description: 'Last update timestamp' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
