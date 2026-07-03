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

  async issueCertificate(
    userId: string,
    quizAttemptId: string,
    holderName: string,
    email: string,
    courseTitle: string,
  ) {
    const certificate = await this.prisma.certificate.create({
      data: { userId, quizAttemptId, holderName, courseTitle },
    });

    try {
      const templateDir = this.configService.get<string>(
        'CERTIFICATE_TEMPLATE_DIR',
        'templates',
      );
      const outputDir = this.configService.get<string>(
        'CERTIFICATE_OUTPUT_DIR',
        'generated/certificates',
      );
      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'https://academy.multihat.dev',
      );
      const pdfBuffer = await generateCertificatePdf(
        holderName,
        courseTitle,
        certificate.certificateId,
        templateDir,
        outputDir,
        frontendUrl,
      );
      await this.emailService.sendCertificateEmail(
        email,
        holderName,
        courseTitle,
        certificate.certificateId,
        pdfBuffer,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Certificate PDF/email delivery failed for certificate ${certificate.certificateId}: ${message}`,
      );
    }

    return certificate;
  }

  async getMyCertificates(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generatePrintableCertificate(certId: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { certificateId: certId },
    });
    if (!cert || !cert.isValid)
      throw new NotFoundException('Certificate not found');

    const templateDir = this.configService.get<string>(
      'CERTIFICATE_TEMPLATE_DIR',
      'templates',
    );
    const outputDir = this.configService.get<string>(
      'CERTIFICATE_OUTPUT_DIR',
      'generated/certificates',
    );
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://academy.multihat.dev',
    );
    const buffer = await generateCertificatePdf(
      cert.holderName,
      cert.courseTitle,
      cert.certificateId,
      templateDir,
      outputDir,
      frontendUrl,
      cert.issueDate,
    );

    return {
      buffer,
      filename: `multihat-certificate-${cert.certificateId}.pdf`,
    };
  }

  async verifyCertificate(certId: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { certificateId: certId },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    const apiUrl = this.configService
      .get<string>('API_URL', 'https://api.multihat.dev/api/v1')
      .replace(/\/$/, '');
    return {
      valid: cert.isValid,
      holderName: cert.holderName,
      courseTitle: cert.courseTitle,
      issueDate: cert.issueDate,
      certificateId: cert.certificateId,
      certificatePdfUrl: `${apiUrl}/certificates/${cert.certificateId}/pdf`,
    };
  }
}
