import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';

const REFERRAL_REWARD_BDT = new Decimal(100);
const REFERRAL_THRESHOLD_BDT = new Decimal(500);

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  async getReferralCode(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    return {
      referralCode: user?.referralCode,
      referralLink: `https://academy.multihat.dev/ref/${user?.referralCode}`,
    };
  }

  async getReferralStats(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      select: { status: true, cumulativeSpend: true, rewardPaid: true, createdAt: true },
    });

    return {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'PENDING').length,
      qualified: referrals.filter((r) => r.status === 'QUALIFIED').length,
      credited: referrals.filter((r) => r.status === 'CREDITED').length,
      totalEarned: referrals.filter((r) => r.rewardPaid).length * 100, // ৳100 per credited referral
    };
  }

  /**
   * Called after every successful order to update cumulative spend for the referred user.
   * If the threshold is met, credits the referrer's wallet.
   */
  async updateCumulativeSpend(referredUserId: string, orderAmount: Decimal) {
    const referral = await this.prisma.referral.findUnique({
      where: { referredUserId },
    });
    if (!referral || referral.status === 'CREDITED') return; // No referral or already paid

    const newSpend = referral.cumulativeSpend.add(orderAmount);

    if (newSpend.greaterThanOrEqualTo(REFERRAL_THRESHOLD_BDT) && !referral.rewardPaid) {
      // Threshold met — credit referrer's wallet
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          cumulativeSpend: newSpend,
          status: 'CREDITED',
          rewardPaid: true,
          qualifiedAt: new Date(),
        },
      });

      await this.walletService.creditReward(
        referral.referrerId,
        REFERRAL_REWARD_BDT,
        'REFERRAL_CREDIT',
        `Referral reward: referred user met ৳500 spending threshold`,
        referral.id,
      );
    } else {
      // Update spend but don't credit yet
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: { cumulativeSpend: newSpend },
      });
    }
  }
}
