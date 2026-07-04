import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';


@Injectable()
export class QuizzesService {
  constructor(
    private prisma: PrismaService,
    private certificatesService: CertificatesService,
  ) {}

  async getQuestions(bookSlug: string, userId: string) {
    const book = await this.prisma.book.findUnique({ where: { slug: bookSlug } });
    if (!book) throw new NotFoundException('Book not found');

    // Verify user has purchased the book
    const order = await this.prisma.order.findFirst({
      where: { userId, bookId: book.id, status: 'PAID' },
    });
    if (!order) throw new ForbiddenException('Purchase required to take the quiz');

    const questions = await this.prisma.quizQuestion.findMany({
      where: { bookId: book.id },
      select: { id: true, prompt: true, options: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    });
    return { bookTitle: book.title, questions };
  }

  async submitQuiz(bookSlug: string, userId: string, selectedAnswers: Record<string, string>) {
    const book = await this.prisma.book.findUnique({ where: { slug: bookSlug } });
    if (!book) throw new NotFoundException('Book not found');

    const order = await this.prisma.order.findFirst({
      where: { userId, bookId: book.id, status: 'PAID' },
    });
    if (!order) throw new ForbiddenException('Purchase required to take the quiz');

    const questions = await this.prisma.quizQuestion.findMany({ where: { bookId: book.id } });
    const totalQuestions = questions.length;
    if (totalQuestions === 0) {
      throw new BadRequestException('Quiz is not available for this book yet');
    }

    // Score the quiz
    let score = 0;
    for (const q of questions) {
      if (selectedAnswers[q.id] === q.correctAnswer) score++;
    }

    const result = score / totalQuestions >= 0.7 ? 'PASS' : 'FAIL';

    // Record attempt
    const attempt = await this.prisma.quizAttempt.create({
      data: { userId, bookId: book.id, selectedAnswers, score, totalQuestions, result },
    });

    // Generate certificate on pass
    let certId: string | undefined;
    if (result === 'PASS') {
      const existingCert = await this.prisma.certificate.findFirst({
        where: {
          userId,
          isValid: true,
          quizAttempt: { bookId: book.id },
        },
      });

      if (existingCert) {
        certId = existingCert.certificateId;
      } else {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const cert = await this.certificatesService.issueCertificate(userId, attempt.id, user!.name, user!.email, book.title);
        certId = cert.certificateId;
      }
    }

    return { score, total: totalQuestions, outcome: result, certId };
  }

  // ─── Admin Methods ───────────────────────────────────────────────────────────

  async listQuestionsAdmin(bookSlug: string) {
    const book = await this.prisma.book.findUnique({ where: { slug: bookSlug } });
    if (!book) throw new NotFoundException('Book not found');
    const questions = await this.prisma.quizQuestion.findMany({
      where: { bookId: book.id },
      orderBy: { sortOrder: 'asc' },
    });
    return { bookId: book.id, bookTitle: book.title, questions };
  }

  async listAllBooks() {
    return this.prisma.book.findMany({
      select: { id: true, title: true, slug: true, isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuestion(dto: {
    bookSlug: string;
    prompt: string;
    options: string[];
    correctAnswer: string;
    sortOrder?: number;
  }) {
    const book = await this.prisma.book.findUnique({ where: { slug: dto.bookSlug } });
    if (!book) throw new NotFoundException('Book not found');

    if (!dto.options.includes(dto.correctAnswer)) {
      throw new BadRequestException('correctAnswer must be one of the provided options');
    }

    // Auto-assign sortOrder if not provided
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const last = await this.prisma.quizQuestion.findFirst({
        where: { bookId: book.id },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = (last?.sortOrder ?? 0) + 1;
    }

    return this.prisma.quizQuestion.create({
      data: {
        bookId: book.id,
        prompt: dto.prompt,
        options: dto.options,
        correctAnswer: dto.correctAnswer,
        sortOrder,
      },
    });
  }

  async updateQuestion(
    id: string,
    dto: Partial<{ prompt: string; options: string[]; correctAnswer: string; sortOrder: number }>,
  ) {
    const question = await this.prisma.quizQuestion.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    const options = dto.options ?? (question.options as string[]);
    const correctAnswer = dto.correctAnswer ?? question.correctAnswer;
    if (!options.includes(correctAnswer)) {
      throw new BadRequestException('correctAnswer must be one of the provided options');
    }

    return this.prisma.quizQuestion.update({ where: { id }, data: dto });
  }

  async deleteQuestion(id: string) {
    const question = await this.prisma.quizQuestion.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    await this.prisma.quizQuestion.delete({ where: { id } });
    return { deleted: true };
  }
}
