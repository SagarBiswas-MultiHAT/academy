import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

    const questions = await this.prisma.quizQuestion.findMany({ where: { bookId: book.id } });
    const totalQuestions = questions.length;

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
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const cert = await this.certificatesService.issueCertificate(userId, attempt.id, user!.name, book.title);
      certId = cert.certificateId;
    }

    return { score, total: totalQuestions, outcome: result, certId };
  }
}
