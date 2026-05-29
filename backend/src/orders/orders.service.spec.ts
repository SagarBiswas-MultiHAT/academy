import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

import { OrdersService } from './orders.service';
import { ensurePremiumPdfFile, getPremiumPdfProductBySlug, getPremiumPdfShortRef, isPremiumPdfProduct } from '../common/utils/premium-pdf';

jest.mock('../common/utils/premium-pdf', () => ({
  ensurePremiumPdfFile: jest.fn(),
  getPremiumPdfProductBySlug: jest.fn(),
  getPremiumPdfShortRef: jest.fn(),
  isPremiumPdfProduct: jest.fn(),
}));

const mockedEnsurePremiumPdfFile = ensurePremiumPdfFile as jest.MockedFunction<typeof ensurePremiumPdfFile>;
const mockedGetPremiumPdfProductBySlug = getPremiumPdfProductBySlug as jest.MockedFunction<typeof getPremiumPdfProductBySlug>;
const mockedGetPremiumPdfShortRef = getPremiumPdfShortRef as jest.MockedFunction<typeof getPremiumPdfShortRef>;
const mockedIsPremiumPdfProduct = isPremiumPdfProduct as jest.MockedFunction<typeof isPremiumPdfProduct>;

function createService() {
  const prisma = {
    book: {
      findUnique: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    coupon: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  } as any;

  const paymentsService = {
    initiatePayment: jest.fn(),
  } as any;

  const walletService = {
    debitForPurchase: jest.fn(),
  } as any;

  const referralsService = {
    updateCumulativeSpend: jest.fn(),
  } as any;

  const emailService = {
    sendPurchaseReceipt: jest.fn(),
  } as any;

  return {
    service: new OrdersService(prisma, paymentsService, walletService, referralsService, emailService),
    prisma,
    paymentsService,
    walletService,
    referralsService,
    emailService,
  };
}

describe('OrdersService premium PDF flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPremiumPdfShortRef.mockReturnValue('ORDER-REF');
    mockedGetPremiumPdfProductBySlug.mockImplementation((slug: string) => {
      if (slug === 'google-dorks-complete-handbook') {
        return {
          slug,
          sourcePdfPath: 'source.pdf',
          generatedDir: 'generated',
          attachmentFilename: 'Google_Dorks_Complete_OSINT_Handbook_Licensed.pdf',
          displayName: 'Google Dorks: The Complete OSINT Handbook',
          requiresGatewayPayment: true,
        };
      }
      return undefined;
    });
    mockedIsPremiumPdfProduct.mockImplementation((slug: string) => slug === 'google-dorks-complete-handbook');
  });

  it('allows wallet checkout for the web package', async () => {
    const { service, prisma } = createService();
    prisma.book.findUnique.mockResolvedValue({
      id: 'book-1',
      slug: 'google-dorks-complete-handbook',
      isPublished: true,
      price: new Decimal(1200),
    });
    prisma.order.findFirst.mockResolvedValue(null);
    prisma.order.create.mockResolvedValue({ id: 'order-1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'buyer@example.com', name: 'Buyer' });

    await expect(service.createOrder('user-1', 'book-1', 'WALLET', undefined, false)).resolves.toEqual({
      orderId: 'order-1',
      paymentMethod: 'WALLET',
      status: 'PAID',
    });
  });

  it('rejects wallet checkout when the printable PDF add-on is selected', async () => {
    const { service, prisma } = createService();
    prisma.book.findUnique.mockResolvedValue({
      id: 'book-1',
      slug: 'google-dorks-complete-handbook',
      isPublished: true,
      price: new Decimal(1200),
    });

    await expect(service.createOrder('user-1', 'book-1', 'WALLET', undefined, true)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a downloadable PDF path for a paid gateway order', async () => {
    const { service, prisma } = createService();
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      aamarpayTranId: 'TXN-123456-PDF',
      status: 'PAID',
      paymentMethod: 'GATEWAY',
      user: { email: 'buyer@example.com' },
      book: { slug: 'google-dorks-complete-handbook' },
    });
    mockedEnsurePremiumPdfFile.mockResolvedValue('C:\\temp\\licensed.pdf');

    await expect(service.downloadPremiumPdf('user-1', 'order-1')).resolves.toEqual({
      filePath: 'C:\\temp\\licensed.pdf',
      attachmentFilename: 'Google_Dorks_Complete_OSINT_Handbook_Licensed.pdf',
      shortOrderRef: 'ORDER-REF',
    });

    expect(mockedEnsurePremiumPdfFile).toHaveBeenCalledWith({
      product: expect.objectContaining({ slug: 'google-dorks-complete-handbook' }),
      orderId: 'order-1',
      aamarpayTranId: 'TXN-123456-PDF',
      buyerEmail: 'buyer@example.com',
    });
  });

  it.each([
    ['pending order', { status: 'PENDING', paymentMethod: 'GATEWAY', userId: 'user-1', slug: 'google-dorks-complete-handbook', tranId: 'TXN-123456-PDF' }],
    ['wallet order', { status: 'PAID', paymentMethod: 'WALLET', userId: 'user-1', slug: 'google-dorks-complete-handbook', tranId: 'TXN-123456-PDF' }],
    ['non-owner order', { status: 'PAID', paymentMethod: 'GATEWAY', userId: 'someone-else', slug: 'google-dorks-complete-handbook', tranId: 'TXN-123456-PDF' }],
    ['non-pdf order', { status: 'PAID', paymentMethod: 'GATEWAY', userId: 'user-1', slug: 'another-book', tranId: 'TXN-123456' }],
  ])('rejects %s downloads', async (_label, orderState: any) => {
    const { service, prisma } = createService();
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: orderState.userId,
      aamarpayTranId: orderState.tranId,
      status: orderState.status,
      paymentMethod: orderState.paymentMethod,
      user: { email: 'buyer@example.com' },
      book: { slug: orderState.slug },
    });

    await expect(service.downloadPremiumPdf('user-1', 'order-1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});