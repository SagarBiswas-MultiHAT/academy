import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralsService } from '../referrals/referrals.service';
import {
  ensurePremiumPdfFile,
  getPremiumPdfProductBySlug,
  getPremiumPdfShortRef,
} from '../common/utils/premium-pdf';
import { Decimal } from '@prisma/client/runtime/library';

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
    const tranId = typeof payload?.mer_txnid === 'string' ? payload.mer_txnid : '';
    if (!tranId) {
      return { status: 'INVALID_TRANSACTION' };
    }

    // 1. Verify IPN signature (timing-safe)
    if (!this.paymentsService.verifyIpnSignature(payload)) {
      return { status: 'INVALID_SIGNATURE' };
    }

    const isSuccessfulPayment = String(payload.pay_status || '').toLowerCase() === 'successful';

    // ─── WALLET TOP-UP FLOW ────────────────────────────────────────────────────
    // Top-up transactions use the "TOPUP-" prefix (see WalletService.initiateTopUp)
    if (tranId.startsWith('TOPUP-')) {
      if (isSuccessfulPayment) {
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

    // ─── PURCHASE ORDER FLOW ───────────────────────────────────────────────────
    // 2. Idempotency: check if already processed
    const order = await this.prisma.order.findUnique({
      where: { aamarpayTranId: tranId },
      include: { user: true, book: true },
    });
    if (!order || order.status === 'PAID') {
      return { status: 'ALREADY_PROCESSED' };
    }

    if (!isSuccessfulPayment) {
      // Mark as failed and return immediately
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED', gatewayResponse: payload },
      });
      return { status: 'FAILED' };
    }

    // 3. Amount verification — reject if aamarPay reports a different amount
    let paidAmount: Decimal;
    try {
      paidAmount = new Decimal(payload.amount);
    } catch {
      paidAmount = new Decimal(-1);
    }

    if (!paidAmount.equals(order.amount)) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED', gatewayResponse: payload },
      });
      return { status: 'AMOUNT_MISMATCH' };
    }

    // 4. Mark order as PAID — must happen before background processing so that
    //    any retry of the IPN hits the idempotency guard above.
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID', gatewayResponse: payload },
    });

    // NOTE: Coupon usageCount is NOT incremented here.
    // It was already atomically reserved in OrdersService.reserveCouponUsage()
    // when the order was first created. Incrementing again here would double-count.

    // 5. Update referral cumulative spend (fast, DB-only)
    await this.referralsService.updateCumulativeSpend(order.userId, order.amount);

    // 6. Fire PDF generation + email delivery in the background so the IPN
    //    response is returned to aamarPay immediately (avoids retry timeouts).
    //    Any failure here is logged but does NOT affect the PAID status.
    const premiumPdfProduct = getPremiumPdfProductBySlug(order.book.slug);
    const hasPdfAddon = Boolean(order.aamarpayTranId?.endsWith('-PDF'));

    setImmediate(() => {
      this.deliverOrderAsync(order, premiumPdfProduct, hasPdfAddon).catch((err) => {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`[IPN] Async post-payment delivery failed for order ${order.id}: ${msg}`);
      });
    });

    return { status: 'SUCCESS' };
  }

  /**
   * Runs PDF generation + email delivery asynchronously after returning the IPN response.
   * PDF files are generated on first download and cached by ensurePremiumPdfFile.
   */
  private async deliverOrderAsync(
    order: { id: string; aamarpayTranId: string | null; user: { email: string; name: string }; book: { title: string; slug: string } },
    premiumPdfProduct: ReturnType<typeof getPremiumPdfProductBySlug>,
    hasPdfAddon: boolean,
  ) {
    if (premiumPdfProduct && hasPdfAddon) {
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
    } else {
      await this.emailService.sendPurchaseReceipt(
        order.user.email,
        order.user.name,
        order.book.title,
      );
    }
  }
}
