import { Controller, Get, Patch, Body, UseGuards, Param, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { UpdateUserRoleDto } from './dto/update-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { parsePagination } from '../common/utils/pagination';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getAllUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pagination = parsePagination(page, limit, 50, 100);
    return this.usersService.getAllUsers(pagination.page, pagination.limit);
  }

  @Patch(':id/role')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }
}
