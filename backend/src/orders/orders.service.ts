import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralsService } from '../referrals/referrals.service';
import { EmailService } from '../email/email.service';
import { Coupon, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  ensurePremiumPdfFile,
  getPremiumPdfProductBySlug,
  getPremiumPdfShortRef,
  isPremiumPdfProduct,
} from '../common/utils/premium-pdf';
import { usdToBdt } from '../common/utils/currency';

const PRINTABLE_PDF_ADDON_USD = 10;

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
    const canDownloadPdf = Boolean(premiumPdfProduct) && order.status === 'PAID' && (order.includesPdf || (order.paymentMethod === 'GATEWAY' && Boolean(order.aamarpayTranId?.endsWith('-PDF'))));

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

    // 2. Check existing orders for book and PDF ownership
    const existingOrders = await this.prisma.order.findMany({
      where: { userId, bookId, status: 'PAID' },
    });
    
    const alreadyOwnsBook = existingOrders.length > 0;
    const alreadyOwnsPdf = existingOrders.some(
      o => o.includesPdf || (o.paymentMethod === 'GATEWAY' && Boolean(o.aamarpayTranId?.endsWith('-PDF')))
    );

    // 3. Load coupon
    let couponId: string | null = null;
    let isPdfIncludedViaCoupon = false;
    let couponRef: Coupon | null = null;

    if (couponCode) {
      const normalizedCode = couponCode.trim().toUpperCase();
      const coupon = await this.prisma.coupon.findUnique({ where: { code: normalizedCode } });
      if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid coupon');
      if (new Date() < coupon.validFrom || new Date() > coupon.validUntil) throw new BadRequestException('Coupon expired');
      if (coupon.usageCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');

      couponRef = coupon;
      couponId = coupon.id;
      isPdfIncludedViaCoupon = coupon.includesPdf;
    }

    const includePremiumPdfAddon = (includePrintablePdf && isPremiumPdfProduct(book.slug)) || isPdfIncludedViaCoupon;

    // 4. Check valid purchase intents
    if (alreadyOwnsBook) {
      if (!includePremiumPdfAddon) {
        throw new BadRequestException('You already own this book');
      }
      if (alreadyOwnsPdf) {
        throw new BadRequestException('You already own this book and its PDF');
      }
    }

    // 5. Enforce gateway-only restriction only when the printable PDF add-on is selected AND not covered by a coupon
    if (paymentMethod === 'WALLET' && includePremiumPdfAddon && !isPdfIncludedViaCoupon) {
      throw new BadRequestException('Printable PDF add-on requires payment via aamarPay gateway');
    }

    const bookPriceToCharge = alreadyOwnsBook ? new Decimal(0) : book.price;
    
    let actualDiscount = new Decimal(0);
    if (couponRef) {
      actualDiscount = couponRef.discountType === 'PERCENTAGE'
        ? bookPriceToCharge.mul(couponRef.discountValue).div(100)
        : couponRef.discountValue;
    }

    const discountedBookAmount = Decimal.max(bookPriceToCharge.minus(actualDiscount), new Decimal(0));
    const printablePdfAddonAmount = (includePremiumPdfAddon && !isPdfIncludedViaCoupon)
      ? new Decimal(usdToBdt(PRINTABLE_PDF_ADDON_USD))
      : new Decimal(0);
    const finalAmount = discountedBookAmount.plus(printablePdfAddonAmount);

    if (finalAmount.lte(0)) {
      const order = await this.prisma.order.create({
        data: {
          userId,
          bookId,
          couponId,
          amount: finalAmount,
          discountApplied: actualDiscount,
          status: 'PAID',
          paymentMethod: 'GATEWAY',
          aamarpayTranId: `FREE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          includesPdf: includePremiumPdfAddon,
        },
      });

      if (couponId) {
        await this.prisma.coupon.update({
          where: { id: couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      await this.referralsService.updateCumulativeSpend(userId, finalAmount);

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      await this.emailService.sendPurchaseReceipt(user!.email, user!.name, book.title);

      return { orderId: order.id, paymentMethod: 'GATEWAY', status: 'PAID' };
    }

    // ─── PATH A: WALLET PAYMENT (instant fulfillment) ───
    if (paymentMethod === 'WALLET') {
      const order = await this.prisma.order.create({
        data: {
          userId,
          bookId,
          couponId,
          amount: finalAmount,
          discountApplied: actualDiscount,
          status: 'PENDING',
          paymentMethod: 'WALLET',
          includesPdf: includePremiumPdfAddon,
        },
      });

      // Debit wallet (throws if insufficient balance)
      await this.walletService.debitForPurchase(userId, finalAmount, order.id);

      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });

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
        discountApplied: actualDiscount,
        status: 'PENDING',
        paymentMethod: 'GATEWAY',
        aamarpayTranId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${includePremiumPdfAddon ? '-PDF' : ''}`,
        includesPdf: includePremiumPdfAddon,
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

    if (order.status !== 'PAID') {
      throw new ForbiddenException('Order is not paid');
    }

    if (!order.includesPdf && !(order.paymentMethod === 'GATEWAY' && order.aamarpayTranId?.endsWith('-PDF'))) {
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
