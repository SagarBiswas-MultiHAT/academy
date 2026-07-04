import axios from 'axios';
import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

import { ShowcasesService } from './showcases.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

function createService() {
  const prisma = {
    certificate: { findUnique: jest.fn() },
    socialShowcase: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  } as any;
  const walletService = { creditReward: jest.fn() } as any;
  const emailService = { sendShowcaseRewardEmail: jest.fn() } as any;

  return { service: new ShowcasesService(prisma, walletService, emailService), prisma, walletService, emailService };
}

describe('ShowcasesService', () => {
  it('rejects duplicate certificate/platform submissions', async () => {
    const { service, prisma } = createService();
    prisma.certificate.findUnique.mockResolvedValue({ id: 'cert-row-1', userId: 'user-1' });
    prisma.socialShowcase.findUnique.mockResolvedValue({ id: 'showcase-1' });

    await expect(service.submitShowcase('user-1', 'CERT-1', 'LINKEDIN', 'https://www.linkedin.com/posts/test-123'))
      .rejects.toThrow(BadRequestException);
  });

  it('creates a pending showcase with the platform reward amount', async () => {
    const { service, prisma } = createService();
    prisma.certificate.findUnique.mockResolvedValue({ id: 'cert-row-1', userId: 'user-1' });
    prisma.socialShowcase.findUnique.mockResolvedValue(null);
    prisma.socialShowcase.create.mockResolvedValue({ id: 'showcase-1' });

    await expect(service.submitShowcase('user-1', 'CERT-1', 'FACEBOOK', 'https://www.facebook.com/posts/test-123'))
      .resolves.toEqual({ id: 'showcase-1' });

    expect(prisma.socialShowcase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ rewardAmount: 20, platform: 'FACEBOOK' }),
    });
  });

  it('credits wallet and emails when a pending post remains live', async () => {
    const { service, prisma, walletService, emailService } = createService();
    prisma.socialShowcase.findMany.mockResolvedValue([
      {
        id: 'showcase-1',
        userId: 'user-1',
        platform: 'LINKEDIN',
        postUrl: 'https://www.linkedin.com/posts/test-123',
        rewardAmount: new Decimal(30),
        user: { email: 'user@example.com', name: 'User' },
        certificate: {},
      },
    ]);
    mockedAxios.head.mockResolvedValue({ status: 200 });

    await service.verifyPendingShowcases();

    expect(prisma.socialShowcase.update).toHaveBeenCalledWith({
      where: { id: 'showcase-1' },
      data: expect.objectContaining({ status: 'VERIFIED' }),
    });
    expect(walletService.creditReward).toHaveBeenCalledWith(
      'user-1',
      new Decimal(30),
      'SHOWCASE_CREDIT',
      expect.any(String),
      'showcase-1',
    );
    expect(emailService.sendShowcaseRewardEmail).toHaveBeenCalledWith('user@example.com', 'User', 'LINKEDIN', 30);
  });
});
