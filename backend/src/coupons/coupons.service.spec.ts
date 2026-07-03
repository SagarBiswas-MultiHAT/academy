import { BadRequestException } from '@nestjs/common';

import { CouponsService } from './coupons.service';

function createService() {
  const prisma = {
    coupon: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as any;

  return { service: new CouponsService(prisma), prisma };
}

describe('CouponsService', () => {
  it('normalizes coupon codes before verifying them', async () => {
    const { service, prisma } = createService();
    const coupon = {
      id: 'coupon-1',
      code: 'LAUNCH50',
      isActive: true,
      validFrom: new Date('2025-01-01T00:00:00.000Z'),
      validUntil: new Date('2030-01-01T00:00:00.000Z'),
      usageCount: 0,
      usageLimit: 10,
    };
    prisma.coupon.findUnique.mockResolvedValue(coupon);

    await expect(service.verifyCoupon(' launch50 ')).resolves.toBe(coupon);
    expect(prisma.coupon.findUnique).toHaveBeenCalledWith({ where: { code: 'LAUNCH50' } });
  });

  it('rejects inactive or exhausted coupons', async () => {
    const { service, prisma } = createService();
    prisma.coupon.findUnique.mockResolvedValue({
      isActive: true,
      validFrom: new Date('2025-01-01T00:00:00.000Z'),
      validUntil: new Date('2030-01-01T00:00:00.000Z'),
      usageCount: 10,
      usageLimit: 10,
    });

    await expect(service.verifyCoupon('FULL')).rejects.toThrow(BadRequestException);
  });
});
