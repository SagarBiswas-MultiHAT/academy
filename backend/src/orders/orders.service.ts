import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralsService } from '../referrals/referrals.service';
import { EmailService } from '../email/email.service';
import { PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Products that MUST use gateway (PDF traceability requires aamarPay paper trail)
const GATEWAY_ONLY_SLUGS: string[] = [
  // Add slugs for Premium E-Book PDFs and Membership-with-PDF products here.
  // Example: 'google-dorks-complete-handbook-pdf', 'annual-membership-with-pdf'
];

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private walletService: WalletService,
    private referralsService: ReferralsService,
    private emailService: EmailService,
  ) {}

  async createOrder(userId: string, bookId: string, paymentMethod: PaymentMethod = 'GATEWAY', couponCode?: string) {
    // 1. Validate book exists
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book || !book.isPublished) throw new NotFoundException('Book not found');

    // 2. Enforce gateway-only restriction for PDF products
    if (paymentMethod === 'WALLET' && GATEWAY_ONLY_SLUGS.includes(book.slug)) {
      throw new BadRequestException('This product requires payment via aamarPay gateway (PDF anti-piracy policy)');
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
        aamarpayTranId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    return this.prisma.order.findMany({
      where: { userId },
      include: { book: { select: { title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
