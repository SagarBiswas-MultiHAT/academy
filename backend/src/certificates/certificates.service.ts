import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { generateCertificatePdf } from '../common/utils/certificate-generator';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async issueCertificate(userId: string, quizAttemptId: string, holderName: string, email: string, courseTitle: string) {
    const certificate = await this.prisma.certificate.create({
      data: { userId, quizAttemptId, holderName, courseTitle },
    });

    try {
      const templateDir = this.configService.get<string>('CERTIFICATE_TEMPLATE_DIR', 'templates');
      const outputDir = this.configService.get<string>('CERTIFICATE_OUTPUT_DIR', 'generated/certificates');
      const pdfBuffer = await generateCertificatePdf(
        holderName,
        courseTitle,
        certificate.certificateId,
        templateDir,
        outputDir,
      );
      await this.emailService.sendCertificateEmail(email, holderName, courseTitle, certificate.certificateId, pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Certificate PDF/email delivery failed for certificate ${certificate.certificateId}: ${message}`);
    }

    return certificate;
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
