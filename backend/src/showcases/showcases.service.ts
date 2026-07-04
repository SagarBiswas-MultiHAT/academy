import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { EmailService } from '../email/email.service';
import { ShowcasePlatform } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import axios from 'axios';

// Reward amounts per platform (in BDT)
const PLATFORM_REWARDS: Record<ShowcasePlatform, number> = {
  LINKEDIN: 30,
  TWITTER: 30,
  FACEBOOK: 20,
  INSTAGRAM: 20,
};

/** Allowed social-media host suffixes to prevent SSRF to internal/private IPs */
const ALLOWED_HOST_SUFFIXES = [
  'linkedin.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'fb.com',
  'instagram.com',
];

function isAllowedHost(urlStr: string): boolean {
  try {
    const { hostname } = new URL(urlStr);
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

@Injectable()
export class ShowcasesService {
  private readonly logger = new Logger(ShowcasesService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private emailService: EmailService,
  ) {}

  async submitShowcase(userId: string, certificateId: string, platform: ShowcasePlatform, postUrl: string) {
    // Verify the URL points to an allowed social-media host
    if (!isAllowedHost(postUrl)) {
      throw new BadRequestException(
        `Post URL must be on a supported social platform (${ALLOWED_HOST_SUFFIXES.join(', ')})`,
      );
    }

    // Verify certificate belongs to user
    const cert = await this.prisma.certificate.findUnique({
      where: { certificateId },
    });
    if (!cert || cert.userId !== userId) {
      throw new NotFoundException('Certificate not found');
    }

    // Check for duplicate submission (one reward per platform per cert)
    const existing = await this.prisma.socialShowcase.findUnique({
      where: { userId_certificateId_platform: { userId, certificateId: cert.id, platform } },
    });
    if (existing) throw new BadRequestException('You already submitted a post for this platform and certificate');

    const rewardAmount = PLATFORM_REWARDS[platform];
    const verifyAfter = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now

    return this.prisma.socialShowcase.create({
      data: {
        userId,
        certificateId: cert.id,
        platform,
        postUrl,
        rewardAmount,
        verifyAfter,
      },
    });
  }

  async getMyShowcases(userId: string) {
    return this.prisma.socialShowcase.findMany({
      where: { userId },
      include: { certificate: { select: { certificateId: true, courseTitle: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cron job: runs daily at midnight to verify pending showcases past their 10-day window.
   * For each qualifying showcase, attempts to check if the post URL is still accessible.
   * On success → credits wallet. On failure → marks as rejected.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async verifyPendingShowcases() {
    const pendingShowcases = await this.prisma.socialShowcase.findMany({
      where: {
        status: 'PENDING',
        verifyAfter: { lte: new Date() },
      },
      include: { user: true, certificate: true },
    });

    for (const showcase of pendingShowcases) {
      try {
        // Re-check host allowlist (URL could have been stored before this guard existed)
        if (!isAllowedHost(showcase.postUrl)) {
          throw new Error('Post URL not on an allowed host');
        }

        // Attempt to reach the post URL (HEAD request with redirect limit)
        const response = await axios.head(showcase.postUrl, {
          timeout: 10000,
          maxRedirects: 3,
        });
        const isLive = response.status >= 200 && response.status < 400;

        if (isLive) {
          // Post is still live — credit wallet
          await this.prisma.socialShowcase.update({
            where: { id: showcase.id },
            data: { status: 'VERIFIED', verifiedAt: new Date() },
          });

          await this.walletService.creditReward(
            showcase.userId,
            new Decimal(showcase.rewardAmount),
            'SHOWCASE_CREDIT',
            `Showcase reward: ${showcase.platform} post verified`,
            showcase.id,
          );

          // Notify user
          await this.emailService.sendShowcaseRewardEmail(
            showcase.user.email,
            showcase.user.name,
            showcase.platform,
            Number(showcase.rewardAmount),
          );
        } else {
          throw new Error('Post not accessible');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.warn(`Showcase ${showcase.id} rejected: ${msg}`);
        // Post is not accessible — reject
        await this.prisma.socialShowcase.update({
          where: { id: showcase.id },
          data: { status: 'REJECTED', verifiedAt: new Date() },
        });
      }
    }
  }
}

