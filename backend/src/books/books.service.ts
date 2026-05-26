import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where: { isPublished: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.book.count({ where: { isPublished: true } }),
    ]);
    return { books, total, page, limit };
  }

  async findBySlug(slug: string) {
    const book = await this.prisma.book.findUnique({ where: { slug } });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  // Admin: Create book
  async create(data: { title: string; slug: string; description: string; price: number; chapterMetadata: any }) {
    return this.prisma.book.create({ data });
  }

  // Admin: Update book
  async update(id: string, data: Partial<{ title: string; description: string; price: number; isPublished: boolean; chapterMetadata: any }>) {
    return this.prisma.book.update({ where: { id }, data });
  }
}
