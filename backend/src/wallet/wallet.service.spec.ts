import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

import { WalletService } from './wallet.service';

function createService() {
  const prisma = {
    user: { findUnique: jest.fn() },
    wallet: { findUnique: jest.fn(), update: jest.fn() },
    walletTransaction: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  } as any;
  const paymentsService = {
    initiatePayment: jest.fn(),
    searchTransaction: jest.fn(),
  } as any;
  const config = { get: jest.fn((_key: string, fallback: string) => fallback) } as any;

  return { service: new WalletService(prisma, paymentsService, config), prisma, paymentsService };
}

describe('WalletService', () => {
  it('enforces the minimum top-up amount', async () => {
    const { service } = createService();

    await expect(service.initiateTopUp('user-1', 49)).rejects.toThrow(BadRequestException);
  });

  it('does not double-credit an already confirmed top-up', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'buyer@example.com' });
    prisma.wallet.findUnique.mockResolvedValue({ id: 'wallet-1' });
    prisma.walletTransaction.findFirst.mockResolvedValue({ id: 'tx-1' });

    await expect(service.confirmTopUp('user-1', 'TOPUP-1')).resolves.toEqual({ status: 'ALREADY_CONFIRMED' });
  });

  it('rejects top-up confirmation when the gateway email does not match the user', async () => {
    const { service, prisma, paymentsService } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'buyer@example.com' });
    prisma.wallet.findUnique.mockResolvedValue({ id: 'wallet-1' });
    prisma.walletTransaction.findFirst.mockResolvedValue(null);
    paymentsService.searchTransaction.mockResolvedValue({
      pay_status: 'Successful',
      cus_email: 'other@example.com',
      amount: '100',
    });

    await expect(service.confirmTopUp('user-1', 'TOPUP-1')).rejects.toThrow(BadRequestException);
  });

  it('debits wallet purchases and records a ledger entry', async () => {
    const { service, prisma } = createService();
    prisma.wallet.findUnique.mockResolvedValue({ id: 'wallet-1', balanceBdt: new Decimal(500) });

    await service.debitForPurchase('user-1', new Decimal(100), 'order-1');

    expect(prisma.wallet.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: {
        balanceBdt: { decrement: new Decimal(100) },
        lifetimeSpent: { increment: new Decimal(100) },
      },
    });
    expect(prisma.walletTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'PURCHASE', referenceId: 'order-1' }),
    });
  });
});
