import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { EmailService } from '../email/email.service';
import { Decimal } from '@prisma/client/runtime/library';
import { formatUsdFromBdt } from '../common/utils/currency';

const REFERRAL_REWARD_BDT = new Decimal(100);
const REFERRAL_THRESHOLD_BDT = new Decimal(500);

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private emailService: EmailService,
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
   *
   * State machine:
   *   PENDING  → (spend >= threshold) → QUALIFIED → CREDITED (reward issued)
   *
   * The QUALIFIED state is set first (atomically) to mark that the threshold was
   * met, then the wallet credit is applied and the status advances to CREDITED.
   * This two-step approach makes the audit trail clear and allows retrying just
   * the reward credit if the wallet service fails.
   */
  async updateCumulativeSpend(referredUserId: string, orderAmount: Decimal) {
    const referral = await this.prisma.referral.findUnique({
      where: { referredUserId },
    });
    if (!referral || referral.status === 'CREDITED') return; // No referral or already paid

    const newSpend = referral.cumulativeSpend.add(orderAmount);

    if (newSpend.greaterThanOrEqualTo(REFERRAL_THRESHOLD_BDT) && !referral.rewardPaid) {
      // Step 1: Mark as QUALIFIED — threshold reached, reward pending
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          cumulativeSpend: newSpend,
          status: 'QUALIFIED',
          qualifiedAt: new Date(),
        },
      });

      // Step 2: Issue wallet credit
      await this.walletService.creditReward(
        referral.referrerId,
        REFERRAL_REWARD_BDT,
        'REFERRAL_CREDIT',
        `Referral reward: referred user met ${formatUsdFromBdt(REFERRAL_THRESHOLD_BDT.toNumber())} spending threshold`,
        referral.id,
      );

      // Step 3: Mark as CREDITED — reward has been issued
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'CREDITED',
          rewardPaid: true,
        },
      });

      // Step 4: Notify the referrer by email (fire-and-forget — don't let email failure block the flow)
      try {
        const referrer = await this.prisma.user.findUnique({
          where: { id: referral.referrerId },
          select: { email: true, name: true },
        });
        const referred = await this.prisma.user.findUnique({
          where: { id: referredUserId },
          select: { name: true },
        });
        if (referrer) {
          await this.emailService.sendReferralRewardEmail(
            referrer.email,
            referrer.name ?? 'there',
            referred?.name ?? 'your friend',
            REFERRAL_REWARD_BDT.toNumber(),
          );
        }
      } catch (emailErr) {
        // Log but don't throw — the reward has already been issued
        console.error('[ReferralsService] Failed to send referral reward email:', emailErr);
      }
    } else {
      // Update spend but don't credit yet
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: { cumulativeSpend: newSpend },
      });
    }
  }
}
