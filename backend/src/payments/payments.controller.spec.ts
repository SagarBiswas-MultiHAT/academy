import { Decimal } from '@prisma/client/runtime/library';

import { PaymentsController } from './payments.controller';
import { ensurePremiumPdfFile, getPremiumPdfProductBySlug, getPremiumPdfShortRef } from '../common/utils/premium-pdf';

jest.mock('../common/utils/premium-pdf', () => ({
  ensurePremiumPdfFile: jest.fn(),
  getPremiumPdfProductBySlug: jest.fn(),
  getPremiumPdfShortRef: jest.fn(),
}));

const mockedEnsurePremiumPdfFile = ensurePremiumPdfFile as jest.MockedFunction<typeof ensurePremiumPdfFile>;
const mockedGetPremiumPdfProductBySlug = getPremiumPdfProductBySlug as jest.MockedFunction<typeof getPremiumPdfProductBySlug>;
const mockedGetPremiumPdfShortRef = getPremiumPdfShortRef as jest.MockedFunction<typeof getPremiumPdfShortRef>;

function createController() {
  const paymentsService = {
    verifyIpnSignature: jest.fn().mockReturnValue(true),
    searchTransaction: jest.fn(),
    getFrontendUrl: jest.fn().mockReturnValue('http://localhost:3000'),
  } as any;
  const prisma = {
    user: { findUnique: jest.fn() },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    coupon: { updateMany: jest.fn() },
  } as any;
  const emailService = {
    sendPurchaseReceipt: jest.fn(),
    sendPremiumPdfDeliveryEmail: jest.fn(),
  } as any;
  const walletService = {
    confirmTopUp: jest.fn(),
  } as any;
  const referralsService = {
    updateCumulativeSpend: jest.fn(),
  } as any;

  return {
    controller: new PaymentsController(paymentsService, prisma, emailService, walletService, referralsService),
    paymentsService,
    prisma,
    emailService,
    walletService,
    referralsService,
  };
}

const flushImmediate = () => new Promise<void>((resolve) => setImmediate(resolve));

function createOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    userId: 'user-1',
    couponId: null,
    status: 'PENDING',
    amount: new Decimal(1200),
    aamarpayTranId: 'TXN-1',
    user: { email: 'buyer@example.com', name: 'Buyer' },
    book: { title: 'Google Dorks', slug: 'google-dorks-complete-handbook' },
    ...overrides,
  };
}

describe('PaymentsController IPN handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPremiumPdfProductBySlug.mockReturnValue(undefined);
    mockedGetPremiumPdfShortRef.mockReturnValue('ORDER-REF');
  });

  it('rejects payloads without a transaction id before signature verification', async () => {
    const { controller, paymentsService } = createController();

    await expect(controller.handleIpn({ amount: '1200' })).resolves.toEqual({ status: 'INVALID_TRANSACTION' });
    expect(paymentsService.verifyIpnSignature).not.toHaveBeenCalled();
  });

  it('rejects payloads with invalid signatures', async () => {
    const { controller, paymentsService } = createController();
    paymentsService.verifyIpnSignature.mockReturnValue(false);

    await expect(controller.handleIpn({ mer_txnid: 'TXN-1', amount: '1200' })).resolves.toEqual({
      status: 'INVALID_SIGNATURE',
    });
  });

  it('confirms successful wallet top-ups through WalletService', async () => {
    const { controller, prisma, walletService } = createController();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    walletService.confirmTopUp.mockResolvedValue({ status: 'CONFIRMED' });

    await expect(
      controller.handleIpn({
        mer_txnid: 'TOPUP-1',
        amount: '500',
        pay_status: 'Successful',
        cus_email: 'buyer@example.com',
      }),
    ).resolves.toEqual({ status: 'TOPUP_SUCCESS' });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'buyer@example.com' } });
    expect(walletService.confirmTopUp).toHaveBeenCalledWith('user-1', 'TOPUP-1');
  });

  it('marks successful purchase orders as paid and sends a receipt', async () => {
    const { controller, prisma, emailService, referralsService } = createController();
    const payload = { mer_txnid: 'TXN-1', amount: '1200', pay_status: 'Successful' };
    prisma.order.findUnique.mockResolvedValue(createOrder({
      couponId: 'coupon-1',
      book: { title: 'Web Book', slug: 'web-book' },
    }));

    await expect(controller.handleIpn(payload)).resolves.toEqual({ status: 'SUCCESS' });
    await flushImmediate();

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'PAID', gatewayResponse: payload },
    });
    expect(prisma.coupon.updateMany).not.toHaveBeenCalled();
    expect(referralsService.updateCumulativeSpend).toHaveBeenCalledWith('user-1', new Decimal(1200));
    expect(emailService.sendPurchaseReceipt).toHaveBeenCalledWith('buyer@example.com', 'Buyer', 'Web Book');
  });

  it('does not process an already paid order twice', async () => {
    const { controller, prisma } = createController();
    prisma.order.findUnique.mockResolvedValue(createOrder({ status: 'PAID' }));

    await expect(
      controller.handleIpn({ mer_txnid: 'TXN-1', amount: '1200', pay_status: 'Successful' }),
    ).resolves.toEqual({ status: 'ALREADY_PROCESSED' });
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('fails successful IPNs whose amount does not match the order', async () => {
    const { controller, prisma, referralsService } = createController();
    const payload = { mer_txnid: 'TXN-1', amount: '1', pay_status: 'Successful' };
    prisma.order.findUnique.mockResolvedValue(createOrder());

    await expect(controller.handleIpn(payload)).resolves.toEqual({ status: 'AMOUNT_MISMATCH' });
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'FAILED', gatewayResponse: payload },
    });
    expect(referralsService.updateCumulativeSpend).not.toHaveBeenCalled();
  });

  it('marks failed purchase payments as failed', async () => {
    const { controller, prisma } = createController();
    const payload = { mer_txnid: 'TXN-1', amount: '1200', pay_status: 'Failed' };
    prisma.order.findUnique.mockResolvedValue(createOrder());

    await expect(controller.handleIpn(payload)).resolves.toEqual({ status: 'FAILED' });
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'FAILED', gatewayResponse: payload },
    });
  });

  it('generates and emails the premium PDF for confirmed PDF add-on orders', async () => {
    const { controller, prisma, emailService } = createController();
    prisma.order.findUnique.mockResolvedValue(createOrder({ aamarpayTranId: 'TXN-1-PDF' }));
    mockedGetPremiumPdfProductBySlug.mockReturnValue({
      slug: 'google-dorks-complete-handbook',
      sourcePdfPath: 'source.pdf',
      generatedDir: 'generated',
      attachmentFilename: 'licensed.pdf',
      displayName: 'Google Dorks',
      requiresGatewayPayment: true,
    });
    mockedEnsurePremiumPdfFile.mockResolvedValue('generated/licensed.pdf');

    await expect(
      controller.handleIpn({ mer_txnid: 'TXN-1-PDF', amount: '1200', pay_status: 'Successful' }),
    ).resolves.toEqual({ status: 'SUCCESS' });
    await flushImmediate();

    expect(mockedEnsurePremiumPdfFile).toHaveBeenCalledWith({
      product: expect.objectContaining({ slug: 'google-dorks-complete-handbook' }),
      orderId: 'order-1',
      aamarpayTranId: 'TXN-1-PDF',
      buyerEmail: 'buyer@example.com',
    });
    expect(emailService.sendPremiumPdfDeliveryEmail).toHaveBeenCalledWith(
      'buyer@example.com',
      'Buyer',
      'Google Dorks',
      'generated/licensed.pdf',
      'licensed.pdf',
      'ORDER-REF',
    );
  });
});
