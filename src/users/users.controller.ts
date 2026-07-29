import { Controller, Get, Param, Patch, Delete, Body, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get public profile of a user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User profile (passwordHash excluded)', type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@Param('id') id: string): Promise<UserDto> {
    const user = await this.service.findOne(id);
    const { passwordHash, ...rest } = user as any;
    return rest as any;
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update own profile (username, email, or password)' })
  @ApiParam({ name: 'id', description: 'User UUID — must match the authenticated user' })
  @ApiResponse({ status: 200, description: 'Updated user profile', type: UserDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — can only update own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() req): Promise<UserDto> {
    const updated = await this.service.update(id, dto, req.user.id, req.user.role);
    const { passwordHash, ...rest } = updated as any;
    return rest as any;
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a user account (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID to delete' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string, @Request() req): Promise<void> {
    await this.service.remove(id, req.user.role);
  }
}
