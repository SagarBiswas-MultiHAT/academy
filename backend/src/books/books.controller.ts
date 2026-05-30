import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, Res, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { Role } from '@prisma/client';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) { }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.booksService.findAll(Number(page) || 1, Number(limit) || 20);
  }

  // IMPORTANT: This specific route must be declared BEFORE the generic :slug route
  // so NestJS doesn't swallow "slug/chapters/index" as a single :slug param.
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug/chapters/:index')
  async getChapterContent(
    @Param('slug') slug: string,
    @Param('index') index: string,
    @Req() req: any,
  ) {
    const userId = req?.user?.id ?? undefined;
    return this.booksService.getChapterContent(slug, Number(index), userId);
  }

  @Get(':slug/media/*')
  getMedia(
    @Param('slug') slug: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const bookDir = path.resolve(process.cwd(), '..', 'books', 'Google_Dorks_Complete_Handbook');

    let mediaPath = req.params[0] || req.params['*'];
    if (!mediaPath) {
      const match = req.url.match(/\/media\/(.+)$/);
      if (match) mediaPath = match[1];
    }
    if (mediaPath) mediaPath = mediaPath.split('?')[0];

    if (!mediaPath) {
      return res.status(404).json({ message: 'Media path not provided' });
    }

    const fullPath = path.join(bookDir, 'media', mediaPath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'Media file not found' });
    }

    return res.sendFile(fullPath);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  findBySlug(@Param('slug') slug: string, @Req() req: any) {
    const userId = req?.user?.id ?? undefined;
    return this.booksService.findBySlug(slug, userId);
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
