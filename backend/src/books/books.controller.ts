import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.booksService.findAll(Number(page) || 1, Number(limit) || 20);
  }

  // IMPORTANT: This specific route must be declared BEFORE the generic :slug route
  // so NestJS doesn't swallow "slug/chapters/index" as a single :slug param.
  @Get(':slug/chapters/:index')
  async getChapterContent(
    @Param('slug') slug: string,
    @Param('index') index: string,
    @Req() req: any,
  ) {
    const userId = req?.user?.sub ?? undefined;
    return this.booksService.getChapterContent(slug, Number(index), userId);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.booksService.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: any) {
    return this.booksService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: any) {
    return this.booksService.update(id, dto);
  }
}
