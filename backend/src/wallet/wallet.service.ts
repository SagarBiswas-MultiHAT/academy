import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { formatUsdFromBdt } from '../common/utils/currency';

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
      throw new BadRequestException(`Minimum top-up is ${formatUsdFromBdt(minTopUp)}`);
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
   * The unique constraint on (walletId, gatewayTranId) acts as an idempotency guard.
   */
  async creditTopUp(userId: string, amount: Decimal, tranId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const topUpDescription = `Wallet top-up via aamarPay (${tranId})`;

    try {
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
            gatewayTranId: tranId,
            type: 'TOPUP',
            amount,
            description: topUpDescription,
          },
        }),
      ]);
    } catch (error) {
      // P2002 = unique constraint violation → duplicate IPN; safe to ignore
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return;
      }
      throw error;
    }
  }

  async confirmTopUp(userId: string, tranId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const existingTopUp = await this.prisma.walletTransaction.findFirst({
      where: {
        walletId: wallet.id,
        type: 'TOPUP',
        gatewayTranId: tranId,
      },
    });

    if (existingTopUp) {
      return { status: 'ALREADY_CONFIRMED' };
    }

    const transaction = await this.paymentsService.searchTransaction(tranId);
    const payStatus = String(transaction?.pay_status || '').toLowerCase();
    const statusCode = String(transaction?.status_code || '');
    const customerEmail = String(transaction?.cus_email || '').toLowerCase();
    const amount = String(transaction?.amount || transaction?.amount_bdt || '').trim();

    if (customerEmail && customerEmail !== user.email.toLowerCase()) {
      throw new BadRequestException('Transaction email does not match the current user');
    }

    if (!amount || !(payStatus === 'successful' || statusCode === '2')) {
      throw new BadRequestException('Transaction is not confirmed yet');
    }

    await this.creditTopUp(userId, new Decimal(amount), tranId);
    return { status: 'CONFIRMED' };
  }

  /**
   * Debit wallet for a purchase. Called by OrdersService for wallet-eligible products.
   *
   * Uses an atomic conditional SQL UPDATE (WHERE balance_bdt >= amount) so that
   * concurrent requests cannot both pass the balance check before decrementing.
   * This eliminates the TOCTOU double-spend race condition.
   */
  async debitForPurchase(userId: string, amount: Decimal, orderId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    await this.prisma.$transaction(async (tx) => {
      // Atomic conditional decrement — only applies if balance >= amount
      const affected = await tx.$executeRaw`
        UPDATE wallets
        SET balance_bdt    = balance_bdt - ${amount},
            lifetime_spent = lifetime_spent + ${amount},
            updated_at     = NOW()
        WHERE user_id      = ${userId}::uuid
          AND balance_bdt  >= ${amount}
      `;

      if (affected === 0) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PURCHASE',
          amount,
          description: `Purchase (Order: ${orderId})`,
          referenceId: orderId,
        },
      });
    });
  }

  /**
   * Credit wallet for referral or showcase rewards.
   */
  async creditReward(
    userId: string,
    amount: Decimal,
    type: 'REFERRAL_CREDIT' | 'SHOWCASE_CREDIT',
    description: string,
    referenceId?: string,
  ) {
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
