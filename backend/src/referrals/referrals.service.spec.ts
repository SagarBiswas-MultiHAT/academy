import { Decimal } from '@prisma/client/runtime/library';

import { ReferralsService } from './referrals.service';

function createService() {
  const prisma = {
    user: { findUnique: jest.fn() },
    referral: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  } as any;
  const walletService = { creditReward: jest.fn() } as any;

  return { service: new ReferralsService(prisma, walletService), prisma, walletService };
}

describe('ReferralsService', () => {
  it('returns the user referral link', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ referralCode: 'REF123' });

    await expect(service.getReferralCode('user-1')).resolves.toEqual({
      referralCode: 'REF123',
      referralLink: 'https://academy.multihat.dev/ref/REF123',
    });
  });

  it('credits the referrer exactly when cumulative spend reaches the threshold', async () => {
    const { service, prisma, walletService } = createService();
    prisma.referral.findUnique.mockResolvedValue({
      id: 'referral-1',
      referrerId: 'referrer-1',
      referredUserId: 'user-1',
      cumulativeSpend: new Decimal(450),
      rewardPaid: false,
      status: 'PENDING',
    });

    await service.updateCumulativeSpend('user-1', new Decimal(50));

    expect(prisma.referral.update).toHaveBeenCalledWith({
      where: { id: 'referral-1' },
      data: expect.objectContaining({ status: 'CREDITED', rewardPaid: true }),
    });
    expect(walletService.creditReward).toHaveBeenCalledWith(
      'referrer-1',
      new Decimal(100),
      'REFERRAL_CREDIT',
      expect.any(String),
      'referral-1',
    );
  });

  it('ignores already credited referrals', async () => {
    const { service, prisma, walletService } = createService();
    prisma.referral.findUnique.mockResolvedValue({ status: 'CREDITED' });

    await service.updateCumulativeSpend('user-1', new Decimal(1000));

    expect(prisma.referral.update).not.toHaveBeenCalled();
    expect(walletService.creditReward).not.toHaveBeenCalled();
  });
});
