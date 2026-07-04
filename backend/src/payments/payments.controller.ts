import { Body, Controller, Get, HttpCode, Logger, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Decimal } from '@prisma/client/runtime/library';
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

type GatewayPayload = Record<string, any>;
type PaymentOrder = {
  id: string;
  userId: string;
  couponId: string | null;
  status: string;
  amount: Decimal;
  aamarpayTranId: string | null;
  user: { email: string; name: string };
  book: { title: string; slug: string };
};

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
  async handleIpn(@Body() payload: GatewayPayload) {
    const tranId = this.getTranId(payload);
    if (!tranId) return { status: 'INVALID_TRANSACTION' };

    if (!this.paymentsService.verifyIpnSignature(payload)) {
      return { status: 'INVALID_SIGNATURE' };
    }

    if (tranId.startsWith('TOPUP-')) {
      if (!this.isSuccessfulPayment(payload)) return { status: 'TOPUP_FAILED' };

      const user = await this.prisma.user.findUnique({
        where: { email: payload.cus_email },
      });
      if (user) {
        await this.walletService.confirmTopUp(user.id, tranId);
      }
      return { status: 'TOPUP_SUCCESS' };
    }

    const order = await this.findOrderByTranId(tranId);
    if (!order || order.status === 'PAID') {
      return { status: 'ALREADY_PROCESSED' };
    }

    if (!this.isSuccessfulPayment(payload)) {
      await this.markOrderFailed(order, payload);
      return { status: 'FAILED' };
    }

    return this.markOrderPaid(order, payload);
  }

  @SkipThrottle()
  @Get('success')
  async handleSuccessGet(@Query() query: GatewayPayload, @Res() res: any) {
    return this.handleGatewayReturn(query, res);
  }

  @SkipThrottle()
  @Post('success')
  @HttpCode(200)
  async handleSuccessPost(@Body() body: GatewayPayload, @Query() query: GatewayPayload, @Res() res: any) {
    return this.handleGatewayReturn({ ...query, ...body }, res);
  }

  @SkipThrottle()
  @Get('fail')
  async handleFailGet(@Query() query: GatewayPayload, @Res() res: any) {
    return this.handleGatewayFailure(query, res, 'failed');
  }

  @SkipThrottle()
  @Post('fail')
  @HttpCode(200)
  async handleFailPost(@Body() body: GatewayPayload, @Query() query: GatewayPayload, @Res() res: any) {
    return this.handleGatewayFailure({ ...query, ...body }, res, 'failed');
  }

  @SkipThrottle()
  @Get('cancel')
  async handleCancelGet(@Query() query: GatewayPayload, @Res() res: any) {
    return this.handleGatewayFailure(query, res, 'cancelled');
  }

  @SkipThrottle()
  @Post('cancel')
  @HttpCode(200)
  async handleCancelPost(@Body() body: GatewayPayload, @Query() query: GatewayPayload, @Res() res: any) {
    return this.handleGatewayFailure({ ...query, ...body }, res, 'cancelled');
  }

  private getTranId(payload: GatewayPayload) {
    const candidates = [payload?.mer_txnid, payload?.tran_id, payload?.id, payload?.request_id];
    const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
    return typeof value === 'string' ? value.trim() : '';
  }

  private isSuccessfulPayment(payload: GatewayPayload) {
    return (
      String(payload.pay_status || '').toLowerCase() === 'successful' ||
      String(payload.status_code || '') === '2'
    );
  }

  private resolvePaidAmount(payload: GatewayPayload) {
    try {
      return new Decimal(payload.amount ?? payload.amount_bdt ?? -1);
    } catch {
      return new Decimal(-1);
    }
  }

  private async findOrderByTranId(tranId: string) {
    const order = await this.prisma.order.findUnique({
      where: { aamarpayTranId: tranId },
      include: { user: true, book: true },
    });
    return order;
  }

  private async releaseCouponReservation(couponId?: string | null) {
    if (!couponId) return;
    await this.prisma.coupon.updateMany({
      where: { id: couponId, usageCount: { gt: 0 } },
      data: { usageCount: { decrement: 1 } },
    });
  }

  private async markOrderFailed(order: PaymentOrder, payload: GatewayPayload) {
    if (order.status === 'PENDING') {
      await this.releaseCouponReservation(order.couponId);
    }
    if (order.status !== 'FAILED') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED', gatewayResponse: payload },
      });
    }
  }

  private async markOrderPaid(order: PaymentOrder, payload: GatewayPayload) {
    if (order.status === 'PAID') {
      return { status: 'ALREADY_PROCESSED' };
    }

    const paidAmount = this.resolvePaidAmount(payload);
    if (!paidAmount.equals(order.amount)) {
      await this.markOrderFailed(order, payload);
      return { status: 'AMOUNT_MISMATCH' };
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID', gatewayResponse: payload },
    });

    await this.referralsService.updateCumulativeSpend(order.userId, order.amount);

    const premiumPdfProduct = getPremiumPdfProductBySlug(order.book.slug);
    const hasPdfAddon = Boolean(order.aamarpayTranId?.endsWith('-PDF'));

    setImmediate(() => {
      this.deliverOrderAsync(order, premiumPdfProduct, hasPdfAddon).catch((err) => {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`[Payment] Async post-payment delivery failed for order ${order.id}: ${msg}`);
      });
    });

    return { status: 'SUCCESS' };
  }

  private async handleGatewayReturn(payload: GatewayPayload, res: any) {
    const tranId = this.getTranId(payload);
    if (!tranId) return this.redirectToFrontend(res, '/payment/fail', { reason: 'missing-transaction' });

    let transaction: GatewayPayload;
    try {
      transaction = await this.paymentsService.searchTransaction(tranId);
    } catch {
      return this.redirectToFrontend(res, '/payment/fail', { id: tranId, reason: 'unverified' });
    }

    if (!this.isSuccessfulPayment(transaction)) {
      return this.redirectToFrontend(res, '/payment/fail', { id: tranId, reason: 'not-successful' });
    }

    if (tranId.startsWith('TOPUP-')) {
      const email = String(transaction.cus_email || '').trim();
      const user = email ? await this.prisma.user.findUnique({ where: { email } }) : null;
      if (!user) return this.redirectToFrontend(res, '/payment/fail', { id: tranId, reason: 'user-not-found' });
      await this.walletService.confirmTopUp(user.id, tranId);
      return this.redirectToFrontend(res, '/payment/success', { id: tranId, verified: '1' });
    }

    const order = await this.findOrderByTranId(tranId);
    if (!order) return this.redirectToFrontend(res, '/payment/fail', { id: tranId, reason: 'order-not-found' });

    const result = await this.markOrderPaid(order, transaction);
    const status = String(result.status);
    if (status === 'SUCCESS' || status === 'ALREADY_PROCESSED') {
      return this.redirectToFrontend(res, '/payment/success', { id: tranId, verified: '1' });
    }
    return this.redirectToFrontend(res, '/payment/fail', { id: tranId, reason: status.toLowerCase() });
  }

  private async handleGatewayFailure(payload: GatewayPayload, res: any, reason: string) {
    const tranId = this.getTranId(payload);
    if (tranId && !tranId.startsWith('TOPUP-')) {
      const order = await this.findOrderByTranId(tranId);
      if (order && order.status !== 'PAID') {
        await this.markOrderFailed(order, payload);
      }
    }
    return this.redirectToFrontend(res, '/payment/fail', { ...(tranId && { id: tranId }), reason });
  }

  private redirectToFrontend(res: any, path: string, params: Record<string, string>) {
    const url = new URL(path, this.paymentsService.getFrontendUrl());
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return res.redirect(url.toString());
  }

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
