import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private configService: ConfigService,
  ) {}

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return {
      balanceBdt: wallet.balanceBdt,
      lifetimeEarned: wallet.lifetimeEarned,
      lifetimeSpent: wallet.lifetimeSpent,
    };
  }

  async initiateTopUp(userId: string, amountBdt: number) {
    const minTopUp = Number(this.configService.get('WALLET_MIN_TOPUP_BDT', '50'));
    if (amountBdt < minTopUp) {
      throw new BadRequestException(`Minimum top-up is ৳${minTopUp}`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const tranId = `TOPUP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Initiate aamarPay payment for wallet top-up
    const payment = await this.paymentsService.initiatePayment(
      tranId,
      amountBdt.toString(),
      user.name,
      user.email,
    );

    return { tranId, paymentUrl: payment.paymentUrl };
  }

  /**
   * Called by IPN handler when a wallet top-up payment is confirmed.
   * Credits the wallet and records the transaction.
   */
  async creditTopUp(userId: string, amount: Decimal, tranId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: {
          balanceBdt: { increment: amount },
          lifetimeEarned: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'TOPUP',
          amount,
          description: `Wallet top-up via aamarPay (${tranId})`,
        },
      }),
    ]);
  }

  /**
   * Debit wallet for a purchase. Called by OrdersService for wallet-eligible products.
   */
  async debitForPurchase(userId: string, amount: Decimal, orderId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.balanceBdt.lessThan(amount)) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: {
          balanceBdt: { decrement: amount },
          lifetimeSpent: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PURCHASE',
          amount,
          description: `Purchase (Order: ${orderId})`,
          referenceId: orderId,
        },
      }),
    ]);
  }

  /**
   * Credit wallet for referral or showcase rewards.
   */
  async creditReward(userId: string, amount: Decimal, type: 'REFERRAL_CREDIT' | 'SHOWCASE_CREDIT', description: string, referenceId?: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: {
          balanceBdt: { increment: amount },
          lifetimeEarned: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount,
          description,
          ...(referenceId && { referenceId }),
        },
      }),
    ]);
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);
    return { transactions, total, page, limit };
  }
}
