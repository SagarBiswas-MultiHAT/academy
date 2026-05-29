import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralsService } from '../referrals/referrals.service';
import { Decimal } from '@prisma/client/runtime/library';
import { ensurePremiumPdfFile, getPremiumPdfProductBySlug, getPremiumPdfShortRef } from '../common/utils/premium-pdf';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private paymentsService: PaymentsService,
    private prisma: PrismaService,
    private emailService: EmailService,
    private walletService: WalletService,
    private referralsService: ReferralsService,
  ) {}

  @SkipThrottle()
  @Post('ipn')
  @HttpCode(200)
  async handleIpn(@Body() payload: any) {
    // 1. Verify signature
    if (!this.paymentsService.verifyIpnSignature(payload)) {
      return { status: 'INVALID_SIGNATURE' };
    }

    const tranId = payload.mer_txnid;

    // ─── WALLET TOP-UP FLOW ───
    // Top-up transactions use the "TOPUP-" prefix (see WalletService.initiateTopUp)
    if (tranId.startsWith('TOPUP-')) {
      if (payload.pay_status === 'Successful') {
        // Find user by email from the IPN payload
        const user = await this.prisma.user.findUnique({
          where: { email: payload.cus_email },
        });
        if (user) {
          await this.walletService.confirmTopUp(user.id, tranId);
        }
        return { status: 'TOPUP_SUCCESS' };
      }
      return { status: 'TOPUP_FAILED' };
    }

    // ─── PURCHASE ORDER FLOW ───
    // 2. Idempotency: check if already processed
    const order = await this.prisma.order.findUnique({
      where: { aamarpayTranId: tranId },
      include: { user: true, book: true },
    });
    if (!order || order.status === 'PAID') {
      return { status: 'ALREADY_PROCESSED' };
    }

    // 3. Update order status
    if (payload.pay_status === 'Successful') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', gatewayResponse: payload },
      });

      // 4. Update coupon usage if applicable
      if (order.couponId) {
        await this.prisma.coupon.update({
          where: { id: order.couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // 5. Update referral cumulative spend
      await this.referralsService.updateCumulativeSpend(order.userId, order.amount);

      const premiumPdfProduct = getPremiumPdfProductBySlug(order.book.slug);
      const hasPdfAddon = Boolean(order.aamarpayTranId?.endsWith('-PDF'));

      if (premiumPdfProduct && hasPdfAddon) {
        try {
          const pdfPath = await ensurePremiumPdfFile({
            product: premiumPdfProduct,
            orderId: order.id,
            aamarpayTranId: order.aamarpayTranId,
            buyerEmail: order.user.email,
          });

          await this.emailService.sendPremiumPdfDeliveryEmail(
            order.user.email,
            order.user.name,
            order.book.title,
            pdfPath,
            premiumPdfProduct.attachmentFilename,
            getPremiumPdfShortRef(order.id, order.aamarpayTranId),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Premium PDF delivery failed for order ${order.id}: ${message}`);
        }
      } else {
        await this.emailService.sendPurchaseReceipt(order.user.email, order.user.name, order.book.title);
      }

      return { status: 'SUCCESS' };
    }

    // Handle failed payment
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'FAILED', gatewayResponse: payload },
    });
    return { status: 'FAILED' };
  }
}
