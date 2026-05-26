import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  async issueCertificate(userId: string, quizAttemptId: string, holderName: string, courseTitle: string) {
    return this.prisma.certificate.create({
      data: { userId, quizAttemptId, holderName, courseTitle },
    });
  }

  async getMyCertificates(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyCertificate(certId: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { certificateId: certId },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    return {
      valid: cert.isValid,
      holderName: cert.holderName,
      courseTitle: cert.courseTitle,
      issueDate: cert.issueDate,
      certificateId: cert.certificateId,
    };
  }
}
