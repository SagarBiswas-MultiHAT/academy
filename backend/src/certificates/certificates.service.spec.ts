import { CertificatesService } from './certificates.service';
import { generateCertificatePdf } from '../common/utils/certificate-generator';

jest.mock('../common/utils/certificate-generator', () => ({
  generateCertificatePdf: jest.fn(),
}));

const mockedGenerateCertificatePdf = generateCertificatePdf as jest.MockedFunction<typeof generateCertificatePdf>;

describe('CertificatesService', () => {
  function createService() {
    const prisma = {
      certificate: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    } as any;
    const config = { get: jest.fn((_key: string, fallback: string) => fallback) } as any;
    const emailService = { sendCertificateEmail: jest.fn() } as any;

    return { service: new CertificatesService(prisma, config, emailService), prisma, emailService };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a certificate, generates its PDF, and sends the certificate email', async () => {
    const { service, prisma, emailService } = createService();
    prisma.certificate.create.mockResolvedValue({ certificateId: 'CERT-1' });
    mockedGenerateCertificatePdf.mockResolvedValue(Buffer.from('pdf'));

    await expect(
      service.issueCertificate('user-1', 'attempt-1', 'User', 'user@example.com', 'Course'),
    ).resolves.toEqual({ certificateId: 'CERT-1' });

    expect(mockedGenerateCertificatePdf).toHaveBeenCalledWith(
      'User',
      'Course',
      'CERT-1',
      'templates',
      'generated/certificates',
      'https://academy.multihat.dev',
    );
    expect(emailService.sendCertificateEmail).toHaveBeenCalledWith(
      'user@example.com',
      'User',
      'Course',
      'CERT-1',
      Buffer.from('pdf'),
    );
  });

  it('returns public verification payloads', async () => {
    const { service, prisma } = createService();
    const issueDate = new Date('2026-01-01T00:00:00.000Z');
    prisma.certificate.findUnique.mockResolvedValue({
      isValid: true,
      holderName: 'User',
      courseTitle: 'Course',
      issueDate,
      certificateId: 'CERT-1',
    });

    await expect(service.verifyCertificate('CERT-1')).resolves.toEqual({
      valid: true,
      holderName: 'User',
      courseTitle: 'Course',
      issueDate,
      certificateId: 'CERT-1',
    });
  });
});
