import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, Res } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { Role } from '@prisma/client';
import { parsePagination } from '../common/utils/pagination';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) { }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pagination = parsePagination(page, limit, 20, 100);
    return this.booksService.findAll(pagination.page, pagination.limit);
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  findAllAdmin(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pagination = parsePagination(page, limit, 50, 200);
    return this.booksService.findAllAdmin(pagination.page, pagination.limit);
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
    // ── Safe allowlist: slug → directory name (prevents slug injection) ──
    const BOOK_DIRS: Record<string, string> = {
      'google-dorks-complete-handbook': 'Google_Dorks_Complete_Handbook',
    };

    const dirName = BOOK_DIRS[slug];
    if (!dirName) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const bookDir = path.resolve(process.cwd(), '..', 'books', dirName);
    const mediaBase = path.resolve(bookDir, 'media');

    let mediaPath = req.params[0] || req.params['*'];
    if (!mediaPath) {
      const match = req.url.match(/\/media\/(.+)$/);
      if (match) mediaPath = match[1];
    }
    if (mediaPath) mediaPath = mediaPath.split('?')[0];

    if (!mediaPath) {
      return res.status(404).json({ message: 'Media path not provided' });
    }

    const fullPath = path.resolve(mediaBase, mediaPath);

    // ── Path traversal guard: resolved path must stay inside the media directory ──
    if (!fullPath.startsWith(mediaBase + path.sep) && fullPath !== mediaBase) {
      return res.status(403).json({ message: 'Forbidden' });
    }

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
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }
}
