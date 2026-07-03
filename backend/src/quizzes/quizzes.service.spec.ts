import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { QuizzesService } from './quizzes.service';

function createService() {
  const prisma = {
    book: { findUnique: jest.fn() },
    order: { findFirst: jest.fn() },
    quizQuestion: { findMany: jest.fn() },
    quizAttempt: { create: jest.fn() },
    certificate: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  } as any;
  const certificatesService = { issueCertificate: jest.fn() } as any;

  return { service: new QuizzesService(prisma, certificatesService), prisma, certificatesService };
}

describe('QuizzesService', () => {
  it('requires a paid order before submitting a quiz', async () => {
    const { service, prisma } = createService();
    prisma.book.findUnique.mockResolvedValue({ id: 'book-1', title: 'Book' });
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(service.submitQuiz('book', 'user-1', {})).rejects.toThrow(ForbiddenException);
  });

  it('rejects books with no quiz questions', async () => {
    const { service, prisma } = createService();
    prisma.book.findUnique.mockResolvedValue({ id: 'book-1', title: 'Book' });
    prisma.order.findFirst.mockResolvedValue({ id: 'order-1' });
    prisma.quizQuestion.findMany.mockResolvedValue([]);

    await expect(service.submitQuiz('book', 'user-1', {})).rejects.toThrow(BadRequestException);
  });

  it('reuses an existing valid certificate on repeated pass attempts', async () => {
    const { service, prisma, certificatesService } = createService();
    prisma.book.findUnique.mockResolvedValue({ id: 'book-1', title: 'Book' });
    prisma.order.findFirst.mockResolvedValue({ id: 'order-1' });
    prisma.quizQuestion.findMany.mockResolvedValue([{ id: 'q1', correctAnswer: 'A' }]);
    prisma.quizAttempt.create.mockResolvedValue({ id: 'attempt-1' });
    prisma.certificate.findFirst.mockResolvedValue({ certificateId: 'CERT-1' });

    await expect(service.submitQuiz('book', 'user-1', { q1: 'A' })).resolves.toEqual({
      score: 1,
      total: 1,
      outcome: 'PASS',
      certId: 'CERT-1',
    });
    expect(certificatesService.issueCertificate).not.toHaveBeenCalled();
  });

  it('issues a certificate with the learner email on the first passing attempt', async () => {
    const { service, prisma, certificatesService } = createService();
    prisma.book.findUnique.mockResolvedValue({ id: 'book-1', title: 'Book' });
    prisma.order.findFirst.mockResolvedValue({ id: 'order-1' });
    prisma.quizQuestion.findMany.mockResolvedValue([{ id: 'q1', correctAnswer: 'A' }]);
    prisma.quizAttempt.create.mockResolvedValue({ id: 'attempt-1' });
    prisma.certificate.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'User', email: 'user@example.com' });
    certificatesService.issueCertificate.mockResolvedValue({ certificateId: 'CERT-2' });

    await service.submitQuiz('book', 'user-1', { q1: 'A' });

    expect(certificatesService.issueCertificate).toHaveBeenCalledWith(
      'user-1',
      'attempt-1',
      'User',
      'user@example.com',
      'Book',
    );
  });
});
