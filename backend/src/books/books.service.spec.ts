import { BooksService } from './books.service';
import { isPremiumPdfProduct } from '../common/utils/premium-pdf';

jest.mock('../common/utils/premium-pdf', () => ({
  getPremiumPdfProductBySlug: jest.fn(),
  isPremiumPdfProduct: jest.fn(),
}));

const mockedIsPremiumPdfProduct = isPremiumPdfProduct as jest.MockedFunction<typeof isPremiumPdfProduct>;

describe('BooksService', () => {
  it('returns published books with computed premium PDF flags', async () => {
    mockedIsPremiumPdfProduct.mockImplementation((slug: string) => slug === 'google-dorks-complete-handbook');
    const prisma = {
      book: {
        findMany: jest.fn().mockResolvedValue([{ id: 'book-1', slug: 'google-dorks-complete-handbook' }]),
        count: jest.fn().mockResolvedValue(1),
      },
    } as any;
    const service = new BooksService(prisma);

    await expect(service.findAll()).resolves.toEqual({
      books: [
        expect.objectContaining({
          id: 'book-1',
          hasPremiumPdf: true,
          requiresGatewayPayment: false,
        }),
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
  });
});
