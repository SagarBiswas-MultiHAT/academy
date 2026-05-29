import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralsService } from '../referrals/referrals.service';
import { EmailService } from '../email/email.service';
import { PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  ensurePremiumPdfFile,
  getPremiumPdfProductBySlug,
  getPremiumPdfShortRef,
  isPremiumPdfProduct,
} from '../common/utils/premium-pdf';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private walletService: WalletService,
    private referralsService: ReferralsService,
    private emailService: EmailService,
  ) {}

  private enrichBook(book: { slug: string }) {
    return {
      ...book,
      hasPremiumPdf: isPremiumPdfProduct(book.slug),
      requiresGatewayPayment: false,
    };
  }

  private enrichOrder(order: any) {
    const premiumPdfProduct = getPremiumPdfProductBySlug(order.book.slug);
    const canDownloadPdf = Boolean(premiumPdfProduct) && order.status === 'PAID' && order.paymentMethod === 'GATEWAY' && Boolean(order.aamarpayTranId?.endsWith('-PDF'));

    return {
      ...order,
      canDownloadPdf,
      pdfFilename: canDownloadPdf ? premiumPdfProduct!.attachmentFilename : null,
      hasPremiumPdf: Boolean(premiumPdfProduct),
      requiresGatewayPayment: Boolean(premiumPdfProduct?.requiresGatewayPayment),
      book: this.enrichBook(order.book),
    };
  }

  async createOrder(
    userId: string,
    bookId: string,
    paymentMethod: PaymentMethod = 'GATEWAY',
    couponCode?: string,
    includePrintablePdf = false,
  ) {
    // 1. Validate book exists
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book || !book.isPublished) throw new NotFoundException('Book not found');

    // 2. Enforce gateway-only restriction only when the printable PDF add-on is selected
    if (paymentMethod === 'WALLET' && includePrintablePdf) {
      throw new BadRequestException('Printable PDF add-on requires payment via aamarPay gateway');
    }

    // 3. Check if already purchased
    const existingOrder = await this.prisma.order.findFirst({
      where: { userId, bookId, status: 'PAID' },
    });
    if (existingOrder) throw new BadRequestException('You already own this book');

    // 4. Calculate discount
    let discount = new Decimal(0);
    let couponId: string | null = null;

    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode } });
      if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid coupon');
      if (new Date() < coupon.validFrom || new Date() > coupon.validUntil) throw new BadRequestException('Coupon expired');
      if (coupon.usageCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');

      discount = coupon.discountType === 'PERCENTAGE'
        ? book.price.mul(coupon.discountValue).div(100)
        : coupon.discountValue;
      couponId = coupon.id;
    }

    const finalAmount = Decimal.max(book.price.minus(discount), new Decimal(0));

    // ─── PATH A: WALLET PAYMENT (instant fulfillment) ───
    if (paymentMethod === 'WALLET') {
      const order = await this.prisma.order.create({
        data: {
          userId,
          bookId,
          couponId,
          amount: finalAmount,
          discountApplied: discount,
          status: 'PAID',
          paymentMethod: 'WALLET',
        },
      });

      // Debit wallet (throws if insufficient balance)
      await this.walletService.debitForPurchase(userId, finalAmount, order.id);

      // Update coupon usage
      if (couponId) {
        await this.prisma.coupon.update({
          where: { id: couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Update referral cumulative spend
      await this.referralsService.updateCumulativeSpend(userId, finalAmount);

      // Send purchase receipt
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      await this.emailService.sendPurchaseReceipt(user!.email, user!.name, book.title);

      return { orderId: order.id, paymentMethod: 'WALLET', status: 'PAID' };
    }

    // ─── PATH B: GATEWAY PAYMENT (redirect to aamarPay) ───
    const order = await this.prisma.order.create({
      data: {
        userId,
        bookId,
        couponId,
        amount: finalAmount,
        discountApplied: discount,
        status: 'PENDING',
        paymentMethod: 'GATEWAY',
        aamarpayTranId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${includePrintablePdf ? '-PDF' : ''}`,
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const payment = await this.paymentsService.initiatePayment(
      order.aamarpayTranId!,
      finalAmount.toString(),
      user!.name,
      user!.email,
    );

    return { orderId: order.id, paymentMethod: 'GATEWAY', paymentUrl: payment.paymentUrl };
  }

  async getMyOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { book: { select: { title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.enrichOrder(order));
  }

  async getAllOrders(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true, role: true } },
          book: { select: { id: true, title: true, slug: true } },
        },
      }),
      this.prisma.order.count(),
    ]);
    return { orders: orders.map((order) => this.enrichOrder(order)), total, page, limit };
  }

  async downloadPremiumPdf(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, book: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    const premiumPdfProduct = getPremiumPdfProductBySlug(order.book.slug);
    if (!premiumPdfProduct) {
      throw new ForbiddenException('This order does not include a downloadable PDF');
    }

    if (order.status !== 'PAID' || order.paymentMethod !== 'GATEWAY' || !order.aamarpayTranId?.endsWith('-PDF')) {
      throw new ForbiddenException('The PDF is only available after gateway payment is confirmed');
    }

    const filePath = await ensurePremiumPdfFile({
      product: premiumPdfProduct,
      orderId: order.id,
      aamarpayTranId: order.aamarpayTranId,
      buyerEmail: order.user.email,
    });

    return {
      filePath,
      attachmentFilename: premiumPdfProduct.attachmentFilename,
      shortOrderRef: getPremiumPdfShortRef(order.id, order.aamarpayTranId),
    };
  }
}
